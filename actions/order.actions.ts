"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createCheckoutSession(addressId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get cart
  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, price: true, globalPrice: true, images: true, stock: true, reservedStock: true, sku: true, shippingCost: true, handlerCost: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

  // Separate in-stock and out-of-stock items (available = stock - reservedStock)
  const inStockItems = cart.items.filter((item) => item.quantity <= (item.product.stock - item.product.reservedStock));
  const preOrderItems = cart.items.filter((item) => item.quantity > (item.product.stock - item.product.reservedStock));

  const hasPreOrder = preOrderItems.length > 0;

  // Calculate subtotal (only charge for in-stock items + pre-order items at full price)
  // For pre-order items, we still charge the customer (pre-order payment)
  const subtotal = cart.items.reduce(
    (sum: number, i: { product: { price: any }; quantity: number }) =>
      sum + Number(i.product.price) * i.quantity,
    0
  );
  const shippingCost = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  // Determine order status
  const orderStatus: string = hasPreOrder ? "PREORDER" : "PENDING";

  // Create Stripe payment intent
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      userId: session.user.id,
      cartId: cart.id,
      hasPreOrder: hasPreOrder ? "true" : "false",
    },
  });

  // Create order with items
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      status: orderStatus as any,
      subtotal,
      shippingCost,
      tax,
      total,
      stripePaymentIntentId: paymentIntent.id,
      shippingAddressId: addressId,
      items: {
        create: cart.items.map((item) => ({
          quantity: item.quantity,
          price: item.product.price,
          productId: item.product.id,
          shippingCost: item.product.shippingCost ?? null,
          handlerCost: item.product.handlerCost ?? null,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // Decrement stock and increment reservedStock for in-stock items
  for (const item of inStockItems) {
    await prisma.product.update({
      where: { id: item.product.id },
      data: {
        stock: { decrement: item.quantity },
        reservedStock: { increment: item.quantity },
      },
    });
  }

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  revalidatePath("/cart");
  revalidatePath("/checkout");

  return {
    orderId: order.id,
    clientSecret: paymentIntent.client_secret,
    hasPreOrder,
  };
}

export async function getOrders() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: { take: 1 } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order || order.userId !== session.user.id) {
    throw new Error("Order not found");
  }

  return order;
}

export async function getAllOrders() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminOrders() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Count orders per date for sequential numbering
  const dateCounts: Record<string, number> = {};
  for (let i = orders.length - 1; i >= 0; i--) {
    const dateKey = new Date(orders[i].createdAt).toISOString().slice(0, 10);
    dateCounts[dateKey] = (dateCounts[dateKey] ?? 0) + 1;
  }

  // Assign sequential numbers in chronological order (oldest first)
  const seqMap: Record<string, number> = {};
  const currentCounts: Record<string, number> = {};
  for (let i = orders.length - 1; i >= 0; i--) {
    const order = orders[i];
    const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
    currentCounts[dateKey] = (currentCounts[dateKey] ?? 0) + 1;
    seqMap[order.id] = currentCounts[dateKey];
  }

  return orders.map((order) => {
    const d = new Date(order.createdAt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    const orderName = `KONCELLS${dd}${mm}${yy}#${seqMap[order.id]}`;

    let totalCosts = 0;
    let totalProfit = 0;
    let itemCount = 0;
    for (const item of order.items) {
      const qty = item.quantity;
      const price = Number(item.price);
      const baseCost = item.costs ? Number(item.costs) : 0;
      const shipping = Number(item.shippingCost ?? 0);
      const handler = Number(item.handlerCost ?? 0);
      const discount = item.discount ? Number(item.discount) : 0;
      const itemCost = (baseCost + shipping + handler) * qty;
      const itemRevenue = price * qty - discount * qty;
      totalCosts += itemCost;
      totalProfit += itemRevenue - itemCost;
      itemCount += qty;
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderName,
      createdAt: order.createdAt,
      customerName: order.user.name,
      customerEmail: order.user.email,
      status: order.status,
      total: Number(order.total),
      totalCosts,
      totalProfit,
      itemCount,
    };
  });
}

export async function updateOrderStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const order = await prisma.order.update({
    where: { id },
    data: { status: status as any },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return order;
}

// ─── Manual Order Actions ──────────────────────────────

const manualOrderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productBrand: z.string().optional().nullable(),
  productModel: z.string().optional().nullable(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),        // custom selling price per unit
  costs: z.number().min(0),        // cost per unit
  discount: z.number().min(0),     // discount per unit
});

const createManualOrderSchema = z.object({
  customerId: z.string(),
  items: z.array(manualOrderItemSchema).min(1),
});

export async function createManualOrder(
  input: z.infer<typeof createManualOrderSchema>
): Promise<ActionResult<{ id: string; orderNumber: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = createManualOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    const { customerId, items } = parsed.data;

    // Fetch product S&H costs for snapshotting
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, shippingCost: true, handlerCost: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate order totals
    let subtotal = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    const orderItemsData = items.map((item) => {
      const lineTotal = item.price * item.quantity;
      const lineCosts = item.costs * item.quantity;
      const lineProfit = (item.price - item.costs - item.discount) * item.quantity;
      const product = productMap.get(item.productId);

      subtotal += lineTotal;
      totalCosts += lineCosts;
      totalProfit += lineProfit;

      return {
        quantity: item.quantity,
        price: item.price,
        costs: item.costs,
        discount: item.discount,
        profit: lineProfit,
        basePrice: item.costs,
        productId: item.productId,
        shippingCost: product?.shippingCost ?? null,
        handlerCost: product?.handlerCost ?? null,
      };
    });

    const total = subtotal; // manual orders don't add shipping/tax

    const order = await prisma.order.create({
      data: {
        userId: customerId,
        status: "PROCESSING",
        subtotal,
        shippingCost: 0,
        tax: 0,
        total,
        totalCosts,
        totalProfit,
        isManualOrder: true,
        items: {
          create: orderItemsData,
        },
      },
    });

    revalidatePath("/admin/orders");
    return { success: true, data: { id: order.id, orderNumber: order.orderNumber } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create order";
    return { success: false, error: message };
  }
}

export async function getAdminOrderById(id: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              brand: true,
              model: true,
              stock: true,
              weight: true,
              images: { orderBy: { position: "asc" }, take: 1 },
              buyingPrice: true,
              competitorsPrice: true,
              globalPrice: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    tax: Number(order.tax),
    total: Number(order.total),
    totalCosts: order.totalCosts ? Number(order.totalCosts) : null,
    totalProfit: order.totalProfit ? Number(order.totalProfit) : null,
    notes: order.notes,
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
      costs: item.costs ? Number(item.costs) : null,
      profit: item.profit ? Number(item.profit) : null,
      discount: item.discount ? Number(item.discount) : null,
      shippingCost: item.shippingCost ? Number(item.shippingCost) : null,
      handlerCost: item.handlerCost ? Number(item.handlerCost) : null,
      competitorsPrice: item.competitorsPrice ? Number(item.competitorsPrice) : null,
      globalPrice: item.globalPrice ? Number(item.globalPrice) : null,
      basePrice: item.basePrice ? Number(item.basePrice) : null,
      product: {
        ...item.product,
        buyingPrice: item.product.buyingPrice ? Number(item.product.buyingPrice) : null,
        competitorsPrice: item.product.competitorsPrice ? Number(item.product.competitorsPrice) : null,
        globalPrice: item.product.globalPrice ? Number(item.product.globalPrice) : null,
        weight: item.product.weight ? Number(item.product.weight) : null,
        price: Number(item.product.price),
      },
    })),
  };
}

// ─── Update Order Item (inline edit) ──────────────────

const updateOrderItemSchema = z.object({
  orderId: z.string(),
  itemId: z.string(),
  quantity: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
  competitorsPrice: z.number().min(0).optional().nullable(),
  globalPrice: z.number().min(0).optional().nullable(),
  costs: z.number().min(0).optional().nullable(),
  discount: z.number().min(0).optional().nullable(),
});

export async function updateOrderItem(
  input: z.infer<typeof updateOrderItemSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = updateOrderItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const { orderId, itemId, ...updates } = parsed.data;

    const currentItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });
    if (!currentItem) return { success: false, error: "Item not found" };

    // When globalPrice (Supplier Price CNY) is updated:
    // 1. Auto-calculate base price (costs) = CNY × default exchange rate
    // 2. Update the original product's buyingPrice (LKR)
    if (updates.globalPrice !== undefined) {
      const exchangeRate = await prisma.exchangeRate.findFirst({
        where: { source: "CNY", target: "LKR", isDefault: true },
        orderBy: { createdAt: "desc" },
      });
      let buyingPrice: number | null = null;
      if (exchangeRate) {
        updates.costs = Number(updates.globalPrice) * Number(exchangeRate.rate);
        buyingPrice = updates.costs;
      }

      // Update the original product's buyingPrice (LKR = CNY × exchange rate)
      await prisma.product.update({
        where: { id: currentItem.productId },
        data: {
          ...(buyingPrice !== null ? { buyingPrice } : {}),
        },
      });
    }

    const quantity = updates.quantity ?? currentItem.quantity;
    const price = updates.price ?? Number(currentItem.price);
    const costs = updates.costs ?? (currentItem.costs ? Number(currentItem.costs) : 0);
    const discount = updates.discount ?? (currentItem.discount ? Number(currentItem.discount) : 0);
    const profit = (price - costs - discount) * quantity;

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        ...updates,
        costs,
        profit,
      },
    });

    // Recalculate order-level totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    let subtotal = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    for (const item of allItems) {
      const ip = Number(item.price);
      const ic = item.costs ? Number(item.costs) : 0;
      const id = item.discount ? Number(item.discount) : 0;
      subtotal += ip * item.quantity;
      totalCosts += ic * item.quantity;
      totalProfit += (ip - ic - id) * item.quantity;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        total: subtotal,
        totalCosts,
        totalProfit,
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update item";
    return { success: false, error: message };
  }
}

// ─── Update Order Notes ───────────────────────────────

const updateOrderNotesSchema = z.object({
  orderId: z.string(),
  notes: z.string().optional().nullable(),
});

export async function updateOrderNotes(
  input: z.infer<typeof updateOrderNotesSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = updateOrderNotesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    await prisma.order.update({
      where: { id: parsed.data.orderId },
      data: { notes: parsed.data.notes ?? null },
    });

    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update notes";
    return { success: false, error: message };
  }
}

// ─── Delete Order Items (bulk) ──────────────────────

export async function deleteOrderItems(
  orderId: string,
  itemIds: string[]
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (itemIds.length === 0) return { success: false, error: "No items selected" };

  try {
    await prisma.orderItem.deleteMany({
      where: { id: { in: itemIds }, orderId },
    });

    // Recalculate order-level totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    let subtotal = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    for (const item of allItems) {
      const ip = Number(item.price);
      const ic = item.costs ? Number(item.costs) : 0;
      const id = item.discount ? Number(item.discount) : 0;
      subtotal += ip * item.quantity;
      totalCosts += ic * item.quantity;
      totalProfit += (ip - ic - id) * item.quantity;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        total: subtotal,
        totalCosts,
        totalProfit,
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete items";
    return { success: false, error: message };
  }
}

// ─── Update Entire Order (Save all items) ──────────

const updateOrderSchema = z.object({
  orderId: z.string(),
  items: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
        discount: z.number().min(0),
      })
    )
    .min(1),
});

export async function updateOrder(
  input: z.infer<typeof updateOrderSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const { orderId, items } = parsed.data;

    for (const item of items) {
      const currentItem = await prisma.orderItem.findUnique({
        where: { id: item.id },
      });
      if (!currentItem) continue;

      const costs = currentItem.costs ? Number(currentItem.costs) : 0;
      const profit = (item.price - costs - item.discount) * item.quantity;

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          profit,
        },
      });
    }

    // Recalculate order-level totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    let subtotal = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    for (const item of allItems) {
      const ip = Number(item.price);
      const ic = item.costs ? Number(item.costs) : 0;
      const id = item.discount ? Number(item.discount) : 0;
      subtotal += ip * item.quantity;
      totalCosts += ic * item.quantity;
      totalProfit += (ip - ic - id) * item.quantity;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        total: subtotal,
        totalCosts,
        totalProfit,
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update order";
    return { success: false, error: message };
  }
}

// ─── Add Items to Existing Order ────────────────────

const addOrderItemsSchema = z.object({
  orderId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
        costs: z.number().min(0),
        discount: z.number().min(0),
      })
    )
    .min(1),
});

export async function addItemsToOrder(
  input: z.infer<typeof addOrderItemsSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = addOrderItemsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const { orderId, items } = parsed.data;

    // Fetch product S&H costs for snapshotting
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, shippingCost: true, handlerCost: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Create order items
    for (const item of items) {
      const profit = (item.price - item.costs - item.discount) * item.quantity;
      const product = productMap.get(item.productId);
      await prisma.orderItem.create({
        data: {
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          costs: item.costs,
          discount: item.discount,
          profit,
          basePrice: item.costs,
          shippingCost: product?.shippingCost ?? null,
          handlerCost: product?.handlerCost ?? null,
        },
      });
    }

    // Recalculate order-level totals
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    let subtotal = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    for (const item of allItems) {
      const ip = Number(item.price);
      const ic = item.costs ? Number(item.costs) : 0;
      const id = item.discount ? Number(item.discount) : 0;
      subtotal += ip * item.quantity;
      totalCosts += ic * item.quantity;
      totalProfit += (ip - ic - id) * item.quantity;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        total: subtotal,
        totalCosts,
        totalProfit,
      },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add items";
    return { success: false, error: message };
  }
}

// ─── Pre-Order helpers ──────────────────────────────

export async function getPreOrdersForOrder(orderId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  const preOrders = await prisma.preOrderItem.findMany({
    where: { orderItem: { orderId } },
    include: {
      purchaseOrderItem: {
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true, supplierName: true },
          },
        },
      },
    },
  });

  return preOrders.map((po) => ({
    id: po.id,
    orderItemId: po.orderItemId,
    quantity: po.quantity,
    createdAt: po.createdAt,
    purchaseOrderItem: {
      id: po.purchaseOrderItem.id,
      purchaseOrderId: po.purchaseOrderItem.purchaseOrderId,
      productId: po.purchaseOrderItem.productId,
      productName: po.purchaseOrderItem.productName,
      productSku: po.purchaseOrderItem.productSku,
      quantity: po.purchaseOrderItem.quantity,
      unitPriceCny: Number(po.purchaseOrderItem.unitPriceCny),
      lineTotalCny: Number(po.purchaseOrderItem.lineTotalCny),
      lineTotalLkr: Number(po.purchaseOrderItem.lineTotalLkr),
      quantityReceived: po.purchaseOrderItem.quantityReceived,
      purchaseOrder: po.purchaseOrderItem.purchaseOrder,
    },
  }));
}

// ─── Add Order Items to Purchase Order ──────────────

export async function addOrderItemsToPurchaseOrder(
  orderItemIds: string[],
  purchaseOrderId?: string,
  supplierName?: string
): Promise<ActionResult<{ purchaseOrderId: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (orderItemIds.length === 0) return { success: false, error: "No order items selected" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all order items with product info
      const orderItems = await tx.orderItem.findMany({
        where: { id: { in: orderItemIds } },
        include: {
          product: {
            select: { id: true, name: true, sku: true, globalPrice: true },
          },
          order: {
            select: { id: true, status: true },
          },
        },
      });

      if (orderItems.length === 0) throw new Error("No order items found");

      // Get the default exchange rate (CNY to LKR)
      const exchangeRate = await tx.exchangeRate.findFirst({
        where: { source: "CNY", target: "LKR", isDefault: true },
        orderBy: { createdAt: "desc" },
      });

      if (!exchangeRate) throw new Error("No CNY to LKR exchange rate configured");

      const rate = Number(exchangeRate.rate);

      // Collect unique order IDs for status update
      const orderIds = [...new Set(orderItems.map((oi) => oi.order.id))];

      let resolvedPurchaseOrderId = purchaseOrderId;

      if (purchaseOrderId && purchaseOrderId.length > 0) {
        // ── Add to existing PO ──────────────────────
        const po = await tx.purchaseOrder.findUnique({
          where: { id: purchaseOrderId },
          select: { exchangeRate: true },
        });

        if (!po) throw new Error("Purchase order not found");

        // Check for duplicate products already on this PO
        const existingProductIds = new Set(
          (await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId },
            select: { productId: true },
          })).map((i) => i.productId)
        );

        for (const orderItem of orderItems) {
          if (existingProductIds.has(orderItem.product.id)) {
            throw new Error(
              `Product "${orderItem.product.name}" is already on this PO. Remove the existing PO item first or update its quantity.`
            );
          }
        }

        for (const orderItem of orderItems) {
          const unitPriceCny = orderItem.product.globalPrice ? Number(orderItem.product.globalPrice) : 0;
          const lineCny = unitPriceCny * orderItem.quantity;
          const lineLkr = lineCny * rate;

          const poItem = await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId,
              productId: orderItem.product.id,
              productName: orderItem.product.name,
              productSku: orderItem.product.sku,
              quantity: orderItem.quantity,
              unitPriceCny,
              lineTotalCny: lineCny,
              lineTotalLkr: lineLkr,
            },
          });

          await tx.preOrderItem.create({
            data: {
              orderItemId: orderItem.id,
              purchaseOrderItemId: poItem.id,
              quantity: orderItem.quantity,
            },
          });
        }

        // Recalculate PO totals
        const allItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId },
        });

        const totalCny = allItems.reduce((sum, i) => sum + Number(i.lineTotalCny), 0);
        const totalLkr = allItems.reduce((sum, i) => sum + Number(i.lineTotalLkr), 0);

        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { totalCny, totalLkr },
        });
      } else {
        // ── Create new PO ───────────────────────────
        const poSupplierName = supplierName || "Ad-hoc Supplier";

        let totalCny = 0;
        const itemRecords: Array<{
          orderItem: (typeof orderItems)[number];
          unitPriceCny: number;
          lineCny: number;
          lineLkr: number;
        }> = [];

        for (const orderItem of orderItems) {
          const unitPriceCny = orderItem.product.globalPrice ? Number(orderItem.product.globalPrice) : 0;
          const lineCny = unitPriceCny * orderItem.quantity;
          const lineLkr = lineCny * rate;
          totalCny += lineCny;
          itemRecords.push({ orderItem, unitPriceCny, lineCny, lineLkr });
        }

        const po = await tx.purchaseOrder.create({
          data: {
            supplierName: poSupplierName,
            totalCny,
            exchangeRate: rate,
            totalLkr: totalCny * rate,
            items: {
              create: itemRecords.map((r) => ({
                productId: r.orderItem.product.id,
                productName: r.orderItem.product.name,
                productSku: r.orderItem.product.sku,
                quantity: r.orderItem.quantity,
                unitPriceCny: r.unitPriceCny,
                lineTotalCny: r.lineCny,
                lineTotalLkr: r.lineLkr,
              })),
            },
          },
        });

        const poItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: po.id },
        });

        for (const poItem of poItems) {
          const matching = itemRecords.find(
            (r) => r.orderItem.product.id === poItem.productId && r.unitPriceCny === Number(poItem.unitPriceCny)
          );
          if (matching) {
            await tx.preOrderItem.create({
              data: {
                orderItemId: matching.orderItem.id,
                purchaseOrderItemId: poItem.id,
                quantity: matching.orderItem.quantity,
              },
            });
          }
        }

        resolvedPurchaseOrderId = po.id;
      }

      // Update order status to AWAITING_STOCK for eligible orders
      const eligibleStatuses: string[] = ["PENDING", "PROCESSING"];
      for (const orderId of orderIds) {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        if (order && eligibleStatuses.includes(order.status)) {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "AWAITING_STOCK" },
          });
        }
      }

      return resolvedPurchaseOrderId!;
    });

    revalidatePath("/admin/purchase-orders");
    if (result) revalidatePath(`/admin/purchase-orders/${result}`);
    revalidatePath("/admin/orders");
    const orderItems = await prisma.orderItem.findMany({
      where: { id: { in: orderItemIds } },
      select: { orderId: true },
    });
    const orderIds = [...new Set(orderItems.map((oi) => oi.orderId))];
    for (const orderId of orderIds) {
      revalidatePath(`/admin/orders/${orderId}`);
    }

    return { success: true, data: { purchaseOrderId: result } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add items to purchase order";
    return { success: false, error: message };
  }
}

// ─── Get Open Purchase Orders (for dropdown selector) ──

export async function getOpenPurchaseOrders(): Promise<
  ActionResult<
    Array<{
      id: string;
      poNumber: number;
      supplierName: string | null;
      createdAt: Date;
    }>
  >
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const pos = await prisma.purchaseOrder.findMany({
      select: { id: true, poNumber: true, supplierName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: pos };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch purchase orders";
    return { success: false, error: message };
  }
}

// ─── Get Order Item Product Statuses ──────────────────

export interface OrderItemStatusInfo {
  itemId: string;
  status: string;
  detail: string | null;
}

export async function getOrderItemStatuses(
  orderId: string
): Promise<OrderItemStatusInfo[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, stock: true },
            },
            preOrderItems: {
              include: {
                purchaseOrderItem: {
                  select: {
                    id: true,
                    purchaseOrderId: true,
                    quantity: true,
                    quantityReceived: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return [];

    // For each item, also look up warehouse inventory for the product
    const productIds = order.items.map((item) => item.product.id);
    const warehouseItems = await prisma.warehouseInventoryItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        status: "IN_WAREHOUSE",
      },
      _sum: { quantity: true },
    });

    const warehouseQtys = new Map(
      warehouseItems.map((w) => [w.productId, w._sum.quantity ?? 0])
    );

    const statuses: OrderItemStatusInfo[] = order.items.map((item) => {
      const warehouseQty = warehouseQtys.get(item.product.id) ?? 0;

      // 1. Check product stock
      if (item.product.stock > 0) {
        return {
          itemId: item.id,
          status: "IN_STOCK",
          detail: `Stock: ${item.product.stock}`,
        };
      }

      // 2. Check warehouse inventory
      if (warehouseQty > 0) {
        return {
          itemId: item.id,
          status: "IN_WAREHOUSE",
          detail: `Warehouse: ${warehouseQty}`,
        };
      }

      // 3. Check pre-order / purchase order status
      // An OrderItem may now have multiple PreOrderItems (split across POs).
      // Aggregate to show the most favorable status.
      const preOrderItems = (item as any).preOrderItems as Array<{
        purchaseOrderItem: {
          status: string;
          purchaseOrderId: string;
        };
      }> | undefined;

      if (preOrderItems && preOrderItems.length > 0) {
        // Determine the "best" status across all pre-orders for this item
        const statusPriority: Record<string, number> = {
          IN_WAREHOUSE: 4,
          PURCHASED: 3,
          ORDERED: 2,
          PENDING: 1,
          CANCELLED: 0,
          RETURNED: 0,
        };

        let bestStatus = "";
        let bestPoId = "";
        let bestPriority = -1;

        for (const preOrder of preOrderItems) {
          const poItemStatus = preOrder.purchaseOrderItem.status;
          const priority = statusPriority[poItemStatus] ?? -1;
          if (priority > bestPriority) {
            bestPriority = priority;
            bestStatus = poItemStatus;
            bestPoId = preOrder.purchaseOrderItem.purchaseOrderId;
          }
        }

        switch (bestStatus) {
          case "IN_WAREHOUSE":
            return {
              itemId: item.id,
              status: "IN_WAREHOUSE",
              detail: `Warehouse (PO)`,
            };
          case "PURCHASED":
            return {
              itemId: item.id,
              status: "PURCHASED",
              detail: `PO #${bestPoId.slice(0, 8)}`,
            };
          case "ORDERED":
            return { itemId: item.id, status: "ORDERED", detail: "PO Ordered" };
          case "CANCELLED":
            return { itemId: item.id, status: "CANCELLED", detail: "PO Cancelled" };
          case "RETURNED":
            return { itemId: item.id, status: "RETURNED", detail: "Returned to Supplier" };
          default:
            return { itemId: item.id, status: "AWAITING_STOCK", detail: "PO Pending" };
        }
      }

      // 4. No stock, no PO, no warehouse
      return { itemId: item.id, status: "NO_STOCK", detail: null };
    });

    return statuses;
  } catch {
    return [];
  }
}
