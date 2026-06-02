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
            select: { id: true, name: true, slug: true, price: true, images: true, stock: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

  // Validate stock
  for (const item of cart.items) {
    if (item.quantity > item.product.stock) {
      throw new Error(`Insufficient stock for ${item.product.name}`);
    }
  }

  const subtotal = cart.items.reduce((sum: number, i: { product: { price: any; }; quantity: number; }) => sum + Number(i.product.price) * i.quantity, 0);
  const shippingCost = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  // Create Stripe payment intent
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    metadata: {
      userId: session.user.id,
      cartId: cart.id,
    },
  });

  // Create order
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      status: "PENDING",
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
        })),
      },
    },
  });

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  revalidatePath("/cart");
  revalidatePath("/checkout");

  return {
    orderId: order.id,
    clientSecret: paymentIntent.client_secret,
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

    // Calculate order totals
    let subtotal = 0;
    let totalCosts = 0;
    let totalProfit = 0;

    const orderItemsData = items.map((item) => {
      const lineTotal = item.price * item.quantity;
      const lineCosts = item.costs * item.quantity;
      const lineProfit = (item.price - item.costs - item.discount) * item.quantity;

      subtotal += lineTotal;
      totalCosts += lineCosts;
      totalProfit += lineProfit;

      return {
        quantity: item.quantity,
        price: item.price,
        costs: item.costs,
        discount: item.discount,
        profit: lineProfit,
        productId: item.productId,
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
              images: { orderBy: { position: "asc" }, take: 1 },
              buyingPrice: true,
              shippingCost: true,
              handlerCost: true,
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
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
      costs: item.costs ? Number(item.costs) : null,
      profit: item.profit ? Number(item.profit) : null,
      discount: item.discount ? Number(item.discount) : null,
      product: {
        ...item.product,
        buyingPrice: item.product.buyingPrice ? Number(item.product.buyingPrice) : null,
        shippingCost: item.product.shippingCost ? Number(item.product.shippingCost) : null,
        handlerCost: item.product.handlerCost ? Number(item.product.handlerCost) : null,
      },
    })),
  };
}
