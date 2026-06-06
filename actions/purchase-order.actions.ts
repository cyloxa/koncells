"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const createPurchaseOrderSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierContact: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        unitPriceCny: z.number().min(0),
      })
    )
    .min(1),
  notes: z.string().optional().nullable(),
});

export async function createPurchaseOrder(
  input: z.infer<typeof createPurchaseOrderSchema>
): Promise<ActionResult<{ id: string; poNumber: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = createPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  try {
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: { source: "CNY", target: "LKR", isDefault: true },
      orderBy: { createdAt: "desc" },
    });

    if (!exchangeRate) return { success: false, error: "No CNY to LKR exchange rate configured" };

    const rate = Number(exchangeRate.rate);

    let totalCny = 0;
    let totalLkr = 0;

    const itemsData = await Promise.all(
      parsed.data.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true },
        });

        if (!product) throw new Error(`Product not found: ${item.productId}`);

        const lineCny = item.unitPriceCny * item.quantity;
        const lineLkr = lineCny * rate;

        totalCny += lineCny;
        totalLkr += lineLkr;

        return {
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPriceCny: item.unitPriceCny,
          lineTotalCny: lineCny,
          lineTotalLkr: lineLkr,
        };
      })
    );

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        supplierName: parsed.data.supplierName,
        supplierContact: parsed.data.supplierContact ?? null,
        supplierId: parsed.data.supplierId ?? null,
        totalCny,
        exchangeRate: rate,
        totalLkr,
        notes: parsed.data.notes ?? null,
        status: "PENDING",
        items: { create: itemsData },
      },
    });

    revalidatePath("/admin/purchase-orders");
    return { success: true, data: { id: purchaseOrder.id, poNumber: purchaseOrder.poNumber } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create purchase order";
    return { success: false, error: message };
  }
}

export async function getPurchaseOrders() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const orders = await prisma.purchaseOrder.findMany({
    include: {
      items: { select: { id: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => {
    const itemCount = o.items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      id: o.id,
      poNumber: o.poNumber,
      supplierName: o.supplierName,
      status: o.status,
      totalCny: Number(o.totalCny),
      exchangeRate: Number(o.exchangeRate),
      totalLkr: Number(o.totalLkr),
      createdAt: o.createdAt,
      itemCount,
    };
  });
}

export async function getPurchaseOrderById(id: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { productName: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              weight: true,
              images: { orderBy: { position: "asc" }, take: 1 },
            },
          },
          preOrderItems: {
            include: {
              orderItem: {
                include: {
                  product: { select: { id: true, name: true, slug: true } },
                  order: { select: { id: true, orderNumber: true, status: true, createdAt: true } },
                },
              },
              purchaseOrderItem: {
                select: {
                  unitPriceCny: true,
                  lineTotalCny: true,
                  lineTotalLkr: true,
                },
              },
            },
          },
        },
      },
      shipments: {
        include: {
          packages: {
            include: {
              items: {
                include: {
                  purchaseOrderItem: { select: { productName: true, productSku: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!po) return null;

  return {
    ...po,
    totalCny: Number(po.totalCny),
    exchangeRate: Number(po.exchangeRate),
    totalLkr: Number(po.totalLkr),
    items: po.items.map((item) => ({
      ...item,
      unitPriceCny: Number(item.unitPriceCny),
      lineTotalCny: Number(item.lineTotalCny),
      lineTotalLkr: Number(item.lineTotalLkr),
      status: item.status,
      product: {
        ...item.product,
        weight: item.product.weight ? Number(item.product.weight) : null,
      },
      preOrderItems: item.preOrderItems.map((pre) => ({
        ...pre,
        orderItem: {
          ...pre.orderItem,
          price: Number(pre.orderItem.price),
          costs: pre.orderItem.costs ? Number(pre.orderItem.costs) : null,
          profit: pre.orderItem.profit ? Number(pre.orderItem.profit) : null,
          discount: pre.orderItem.discount ? Number(pre.orderItem.discount) : null,
          competitorsPrice: pre.orderItem.competitorsPrice ? Number(pre.orderItem.competitorsPrice) : null,
          globalPrice: pre.orderItem.globalPrice ? Number(pre.orderItem.globalPrice) : null,
          basePrice: pre.orderItem.basePrice ? Number(pre.orderItem.basePrice) : null,
        },
        purchaseOrderItem: {
          ...pre.purchaseOrderItem,
          unitPriceCny: Number(pre.purchaseOrderItem.unitPriceCny),
          lineTotalCny: Number(pre.purchaseOrderItem.lineTotalCny),
          lineTotalLkr: Number(pre.purchaseOrderItem.lineTotalLkr),
        },
      })),
    })),
    shipments: po.shipments.map((s) => ({
      ...s,
      totalWeight: s.totalWeight ? Number(s.totalWeight) : null,
      baseShippingCost: s.baseShippingCost ? Number(s.baseShippingCost) : null,
      extraCost: s.extraCost ? Number(s.extraCost) : null,
      totalShippingCost: s.totalShippingCost ? Number(s.totalShippingCost) : null,
      packages: s.packages.map((pkg) => ({
        ...pkg,
        weight: Number(pkg.weight),
        items: pkg.items.map((pi) => ({
          ...pi,
        })),
      })),
    })),
  };
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: "ORDERED" | "RECEIVED" | "CANCELLED"
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const validTransitions: Record<string, string[]> = {
    PENDING: ["ORDERED", "CANCELLED"],
    ORDERED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["PARTIAL", "RECEIVED"],
    PARTIAL: ["RECEIVED"],
  };

  try {
    const current = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!current) return { success: false, error: "Purchase order not found" };

    const allowed = validTransitions[current.status] ?? [];
    if (!allowed.includes(status)) {
      return {
        success: false,
        error: `Cannot transition from ${current.status} to ${status}`,
      };
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "ORDERED") updateData.orderedAt = new Date();
    if (status === "RECEIVED") updateData.receivedAt = new Date();

    await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/purchase-orders");
    revalidatePath(`/admin/purchase-orders/${id}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update status";
    return { success: false, error: message };
  }
}

// ─── Add items to existing PO ───────────────────────────

const addItemsSchema = z.object({
  purchaseOrderId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        unitPriceCny: z.number().min(0),
      })
    )
    .min(1),
});

export async function addItemsToPurchaseOrder(
  input: z.infer<typeof addItemsSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = addItemsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: parsed.data.purchaseOrderId },
      select: { id: true, exchangeRate: true, status: true },
    });

    if (!po) return { success: false, error: "Purchase order not found" };
    if (po.status !== "PENDING" && po.status !== "ORDERED") {
      return { success: false, error: "Can only add items to PENDING or ORDERED purchase orders" };
    }

    const rate = Number(po.exchangeRate);

    const itemsData = await Promise.all(
      parsed.data.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true },
        });

        if (!product) throw new Error(`Product not found: ${item.productId}`);

        return {
          purchaseOrderId: parsed.data.purchaseOrderId,
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPriceCny: item.unitPriceCny,
          lineTotalCny: item.unitPriceCny * item.quantity,
          lineTotalLkr: item.unitPriceCny * item.quantity * rate,
        };
      })
    );

    await prisma.purchaseOrderItem.createMany({ data: itemsData });

    // Recalculate totals
    const allItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: parsed.data.purchaseOrderId },
    });

    const totalCny = allItems.reduce((sum, i) => sum + Number(i.lineTotalCny), 0);
    const totalLkr = allItems.reduce((sum, i) => sum + Number(i.lineTotalLkr), 0);

    await prisma.purchaseOrder.update({
      where: { id: parsed.data.purchaseOrderId },
      data: { totalCny, totalLkr },
    });

    revalidatePath(`/admin/purchase-orders/${parsed.data.purchaseOrderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add items";
    return { success: false, error: message };
  }
}

// ─── Bulk delete PO items ──────────────────────────────

export async function bulkDeletePurchaseOrderItems(
  poItemIds: string[]
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (poItemIds.length === 0) return { success: false, error: "No items selected" };

  try {
    // Get the parent PO id
    const firstItem = await prisma.purchaseOrderItem.findUnique({
      where: { id: poItemIds[0] },
      select: { purchaseOrderId: true },
    });

    if (!firstItem) return { success: false, error: "Items not found" };

    const purchaseOrderId = firstItem.purchaseOrderId;

    // Delete linked pre-order items first
    await prisma.preOrderItem.deleteMany({
      where: { purchaseOrderItemId: { in: poItemIds } },
    });

    // Delete the PO items
    await prisma.purchaseOrderItem.deleteMany({
      where: { id: { in: poItemIds }, purchaseOrderId },
    });

    // Recalculate PO totals
    const allItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
    });

    const totalCny = allItems.reduce((sum, i) => sum + Number(i.lineTotalCny), 0);
    const totalLkr = allItems.reduce((sum, i) => sum + Number(i.lineTotalLkr), 0);

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { totalCny, totalLkr },
    });

    revalidatePath(`/admin/purchase-orders/${purchaseOrderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete items";
    return { success: false, error: message };
  }
}

// ─── Update PO item status ─────────────────────────────

export async function updatePurchaseOrderItemStatus(
  poItemId: string,
  status: "PENDING" | "PURCHASED" | "IN_WAREHOUSE" | "CANCELLED" | "RETURNED"
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const item = await prisma.purchaseOrderItem.findUnique({
      where: { id: poItemId },
      select: {
        productId: true,
        productName: true,
        productSku: true,
        quantity: true,
        purchaseOrder: { select: { id: true } },
      },
    });

    if (!item) return { success: false, error: "Item not found" };

    await prisma.purchaseOrderItem.update({
      where: { id: poItemId },
      data: { status },
    });

    // When status changes to IN_WAREHOUSE, upsert the warehouse stock
    if (status === "IN_WAREHOUSE") {
      await prisma.warehouseStock.upsert({
        where: { productId: item.productId },
        create: {
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantityInStock: item.quantity,
        },
        update: {
          quantityInStock: { increment: item.quantity },
          productName: item.productName,
          productSku: item.productSku,
        },
      });
    }

    // If status changes away from IN_WAREHOUSE (e.g. CANCELLED or RETURNED),
    // decrement the warehouse stock (but don't go below 0)
    if (status !== "IN_WAREHOUSE") {
      const existing = await prisma.warehouseStock.findUnique({
        where: { productId: item.productId },
      });

      if (existing && existing.quantityInStock > 0) {
        const previousStatus = (
          await prisma.purchaseOrderItem.findUnique({
            where: { id: poItemId },
            select: { status: true },
          })
        )?.status;

        // Only decrement if the item was previously IN_WAREHOUSE
        if (previousStatus === "IN_WAREHOUSE") {
          await prisma.warehouseStock.update({
            where: { productId: item.productId },
            data: {
              quantityInStock: Math.max(0, existing.quantityInStock - item.quantity),
            },
          });
        }
      }
    }

    revalidatePath("/admin/warehouse/inventory");
    revalidatePath(`/admin/purchase-orders/${item.purchaseOrder.id}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update item status";
    return { success: false, error: message };
  }
}

// ─── Update PO item quantity / price / notes ───────────

const UpdatePOItemSchema = z.object({
  poItemId: z.string(),
  quantity: z.number().int().min(1).optional(),
  unitPriceCny: z.number().min(0).optional(),
});

export async function updatePurchaseOrderItem(
  poItemId: string,
  quantity?: number,
  unitPriceCny?: number
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = UpdatePOItemSchema.safeParse({ poItemId, quantity, unitPriceCny });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const poItem = await prisma.purchaseOrderItem.findUnique({
      where: { id: parsed.data.poItemId },
      include: {
        purchaseOrder: { select: { id: true, status: true, exchangeRate: true } },
        preOrderItems: {
          include: {
            orderItem: {
              select: { id: true, orderId: true, quantity: true },
            },
          },
        },
      },
    });

    if (!poItem) return { success: false, error: "Purchase order item not found" };

    const po = poItem.purchaseOrder;
    if (po.status !== "PENDING" && po.status !== "ORDERED") {
      return { success: false, error: "Can only update items on PENDING or ORDERED purchase orders" };
    }

    const rate = Number(po.exchangeRate);
    const currentQty = poItem.quantity;
    const currentPrice = Number(poItem.unitPriceCny);

    const newQty = parsed.data.quantity ?? currentQty;
    const newPrice = parsed.data.unitPriceCny ?? currentPrice;

    const newLineCny = newPrice * newQty;
    const newLineLkr = newLineCny * rate;

    await prisma.purchaseOrderItem.update({
      where: { id: parsed.data.poItemId },
      data: {
        quantity: newQty,
        unitPriceCny: newPrice,
        lineTotalCny: newLineCny,
        lineTotalLkr: newLineLkr,
      },
    });

    // Recalculate PO-level totals
    const allItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id },
      select: { lineTotalCny: true, lineTotalLkr: true },
    });

    const totalCny = allItems.reduce((sum, i) => sum + Number(i.lineTotalCny), 0);
    const totalLkr = allItems.reduce((sum, i) => sum + Number(i.lineTotalLkr), 0);

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { totalCny, totalLkr },
    });

    // Cost propagation to linked orders
    if (poItem.preOrderItems.length > 0) {
      const orderIds = new Set<string>();

      for (const preOrderItem of poItem.preOrderItems) {
        const orderItemId = preOrderItem.orderItem.id;
        orderIds.add(preOrderItem.orderItem.orderId);

        const allocationRatio = currentQty > 0 ? preOrderItem.quantity / currentQty : 0;
        const itemCost = newLineLkr * allocationRatio;

        await prisma.orderItem.update({
          where: { id: orderItemId },
          data: {
            costs: itemCost,
            globalPrice: newPrice,
          },
        });
      }

      for (const orderId of orderIds) {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId },
          select: { costs: true, profit: true },
        });

        const totalCosts = orderItems.reduce(
          (sum, oi) => sum + (oi.costs ? Number(oi.costs) : 0),
          0
        );
        const totalProfit = orderItems.reduce(
          (sum, oi) => sum + (oi.profit ? Number(oi.profit) : 0),
          0
        );

        await prisma.order.update({
          where: { id: orderId },
          data: { totalCosts, totalProfit },
        });
      }
    }

    revalidatePath(`/admin/purchase-orders/${po.id}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update purchase order item";
    return { success: false, error: message };
  }
}

// ─── Delete single PO item ─────────────────────────────

export async function deletePurchaseOrderItem(
  poItemId: string
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const poItem = await prisma.purchaseOrderItem.findUnique({
      where: { id: poItemId },
      include: {
        purchaseOrder: { select: { id: true, status: true } },
        preOrderItems: { select: { id: true } },
      },
    });

    if (!poItem) return { success: false, error: "Purchase order item not found" };

    const po = poItem.purchaseOrder;
    if (po.status !== "PENDING" && po.status !== "ORDERED") {
      return { success: false, error: "Can only delete items from PENDING or ORDERED purchase orders" };
    }

    if (poItem.preOrderItems.length > 0) {
      await prisma.preOrderItem.deleteMany({
        where: { purchaseOrderItemId: poItemId },
      });
    }

    await prisma.purchaseOrderItem.delete({
      where: { id: poItemId },
    });

    const allItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id },
      select: { lineTotalCny: true, lineTotalLkr: true },
    });

    const totalCny = allItems.reduce((sum, i) => sum + Number(i.lineTotalCny), 0);
    const totalLkr = allItems.reduce((sum, i) => sum + Number(i.lineTotalLkr), 0);

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { totalCny, totalLkr },
    });

    revalidatePath(`/admin/purchase-orders/${po.id}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete purchase order item";
    return { success: false, error: message };
  }
}

// ─── Delete purchase orders ────────────────────────────

export async function deletePurchaseOrders(
  ids: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (ids.length === 0) return { success: false, error: "No purchase orders selected" };

  try {
    await prisma.purchaseOrder.deleteMany({
      where: { id: { in: ids }, status: { in: ["PENDING", "CANCELLED"] } },
    });

    revalidatePath("/admin/purchase-orders");
    return { success: true, data: { count: ids.length } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete purchase orders";
    return { success: false, error: message };
  }
}

// ─── Update PO notes ───────────────────────────────────

export async function updatePurchaseOrderNotes(
  id: string,
  notes: string | null
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    await prisma.purchaseOrder.update({
      where: { id },
      data: { notes },
    });

    revalidatePath(`/admin/purchase-orders/${id}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update notes";
    return { success: false, error: message };
  }
}
