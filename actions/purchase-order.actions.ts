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
        totalCny,
        exchangeRate: rate,
        totalLkr,
        notes: parsed.data.notes ?? null,
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
    },
  });

  if (!po) return null;

  const shipments = await prisma.warehouseShipment.findMany({
    where: { inventoryItems: { some: { purchaseOrderId: id } } },
    select: {
      id: true,
      shipmentNumber: true,
      status: true,
      totalWeight: true,
      shippingRatePerKg: true,
      extraCost: true,
      totalShippingCost: true,
      notes: true,
      shippedAt: true,
      deliveredAt: true,
      createdAt: true,
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
  });

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
          shippingCost: pre.orderItem.shippingCost ? Number(pre.orderItem.shippingCost) : null,
          handlerCost: pre.orderItem.handlerCost ? Number(pre.orderItem.handlerCost) : null,
        },
        purchaseOrderItem: {
          ...pre.purchaseOrderItem,
          unitPriceCny: Number(pre.purchaseOrderItem.unitPriceCny),
          lineTotalCny: Number(pre.purchaseOrderItem.lineTotalCny),
          lineTotalLkr: Number(pre.purchaseOrderItem.lineTotalLkr),
        },
      })),
    })),
    shipments: shipments.map((s) => ({
      ...s,
      totalWeight: s.totalWeight ? Number(s.totalWeight) : null,
      shippingRatePerKg: s.shippingRatePerKg ? Number(s.shippingRatePerKg) : null,
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
    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: parsed.data.purchaseOrderId },
        select: { id: true, exchangeRate: true },
      });

      if (!po) throw new Error("Purchase order not found");

      // Check for duplicate product IDs already on this PO
      const existingProductIds = new Set(
        (await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: parsed.data.purchaseOrderId },
          select: { productId: true },
        })).map((i) => i.productId)
      );

      const newProductIds = new Set(parsed.data.items.map((item) => item.productId));
      const duplicates = [...newProductIds].filter((id) => existingProductIds.has(id));
      if (duplicates.length > 0) {
        const productDetails = await tx.product.findMany({
          where: { id: { in: duplicates } },
          select: { name: true },
        });
        const names = productDetails.map((p) => p.name).join(", ");
        throw new Error(`Product(s) already on this PO: ${names}. Remove existing items or update their quantities instead.`);
      }

      // Also check for duplicate product IDs within the new items themselves
      if (newProductIds.size !== parsed.data.items.length) {
        throw new Error("Duplicate products in the new items list. Each product must be unique.");
      }

      const rate = Number(po.exchangeRate);

      const itemsData = await Promise.all(
        parsed.data.items.map(async (item) => {
          const product = await tx.product.findUnique({
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

      await tx.purchaseOrderItem.createMany({ data: itemsData });

      // Recalculate totals
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: parsed.data.purchaseOrderId },
      });

      const totalCny = allItems.reduce((sum, i) => sum + Number(i.lineTotalCny), 0);
      const totalLkr = allItems.reduce((sum, i) => sum + Number(i.lineTotalLkr), 0);

      await tx.purchaseOrder.update({
        where: { id: parsed.data.purchaseOrderId },
        data: { totalCny, totalLkr },
      });

      return true;
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
        purchaseOrderId: true,
        productId: true,
        productName: true,
        productSku: true,
        quantity: true,
        quantityReceived: true,
        purchaseOrder: { select: { id: true } },
      },
    });

    if (!item) return { success: false, error: "Item not found" };

    const previousStatus = (
      await prisma.purchaseOrderItem.findUnique({
        where: { id: poItemId },
        select: { status: true },
      })
    )?.status;

    const receivedQuantity =
      status === "IN_WAREHOUSE" && item.quantityReceived === 0
        ? item.quantity
        : item.quantityReceived;

    await prisma.purchaseOrderItem.update({
      where: { id: poItemId },
      data: {
        status,
        ...(status === "IN_WAREHOUSE" && item.quantityReceived === 0
          ? { quantityReceived: receivedQuantity }
          : {}),
      },
    });

    // When status changes to IN_WAREHOUSE, create a warehouse inventory item
    // Use quantityReceived (what was actually received) not quantity (what was ordered).
    // Delete any existing IN_WAREHOUSE records first to avoid duplicates from status toggling.
    if (status === "IN_WAREHOUSE") {
      await prisma.warehouseInventoryItem.deleteMany({
        where: {
          purchaseOrderId: item.purchaseOrderId,
          productId: item.productId,
          status: "IN_WAREHOUSE",
        },
      });

      await prisma.warehouseInventoryItem.create({
        data: {
          purchaseOrderId: item.purchaseOrderId,
          productId: item.productId,
          productName: item.productName,
          quantity: receivedQuantity,
          status: "IN_WAREHOUSE",
        },
      });
    }

    // If status changes away from IN_WAREHOUSE, remove the inventory items
    if (status !== "IN_WAREHOUSE" && previousStatus === "IN_WAREHOUSE") {
      await prisma.warehouseInventoryItem.deleteMany({
        where: {
          purchaseOrderId: item.purchaseOrderId,
          productId: item.productId,
          status: "IN_WAREHOUSE",
        },
      });
    }

    revalidatePath("/admin/warehouse/inventory");
    revalidatePath(`/admin/purchase-orders/${item.purchaseOrder.id}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update item status";
    return { success: false, error: message };
  }
}

// ─── Update PO item quantity / price ───────────────────

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
        purchaseOrder: { select: { id: true, exchangeRate: true } },
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
        ...(poItem.status === "IN_WAREHOUSE" ? { quantityReceived: newQty } : {}),
        unitPriceCny: newPrice,
        lineTotalCny: newLineCny,
        lineTotalLkr: newLineLkr,
      },
    });

    if (poItem.status === "IN_WAREHOUSE") {
      await prisma.warehouseInventoryItem.deleteMany({
        where: {
          purchaseOrderId: po.id,
          productId: poItem.productId,
          status: "IN_WAREHOUSE",
        },
      });

      await prisma.warehouseInventoryItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: poItem.productId,
          productName: poItem.productName,
          quantity: newQty,
          status: "IN_WAREHOUSE",
        },
      });
    }

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
        purchaseOrder: { select: { id: true } },
        preOrderItems: { select: { id: true } },
      },
    });

    if (!poItem) return { success: false, error: "Purchase order item not found" };

    const po = poItem.purchaseOrder;

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
    // Delete related records in the right order to avoid FK violations
    for (const poId of ids) {
      // 1. Delete PreOrderItems linked to this PO's items
      await prisma.preOrderItem.deleteMany({
        where: { purchaseOrderItem: { purchaseOrderId: poId } },
      });

      // 2. Delete WarehousePackageItems linked to this PO's items
      //    (need to find package item IDs via purchase order items)
      const poItemIds = await prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: poId },
        select: { id: true },
      });
      const poItemIdList = poItemIds.map((i) => i.id);

      if (poItemIdList.length > 0) {
        await prisma.warehousePackageItem.deleteMany({
          where: { purchaseOrderItemId: { in: poItemIdList } },
        });
      }

      // 3. Delete WarehouseInventoryItems from this PO.
      await prisma.warehouseInventoryItem.deleteMany({
        where: { purchaseOrderId: poId },
      });
    }

    // Now delete the purchase orders (items cascade automatically)
    await prisma.purchaseOrder.deleteMany({
      where: { id: { in: ids } },
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

// ─── Warehouse Inventory Actions ───────────────────────

export async function getWarehouseInventory() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const items = await prisma.warehouseInventoryItem.findMany({
    where: { status: "IN_WAREHOUSE", shipmentId: null },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          weight: true,
          price: true,
          stock: true,
          reservedStock: true,
          images: { orderBy: { position: "asc" }, take: 1 },
        },
      },
      shipment: {
        select: {
          id: true,
          shipmentNumber: true,
          status: true,
        },
      },
    },
    orderBy: { lastUpdated: "desc" },
  });

  return items.map((item) => ({
    id: item.id,
    purchaseOrderId: item.purchaseOrderId,
    purchaseOrderNumber: item.purchaseOrder.poNumber,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    weight: item.weight ? Number(item.weight) : null,
    status: item.status,
    shipmentId: item.shipmentId,
    shipmentNumber: item.shipment?.shipmentNumber ?? null,
    shipmentStatus: item.shipment?.status ?? null,
    lastUpdated: item.lastUpdated,
    createdAt: item.createdAt,
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          weight: item.product.weight ? Number(item.product.weight) : null,
          price: Number(item.product.price),
          stock: item.product.stock,
          reservedStock: item.product.reservedStock,
          images: item.product.images,
        }
      : null,
  }));
}

export async function updateInventoryItem(
  inventoryItemId: string,
  data: {
    shipmentId?: string | null;
    assignQuantity?: number;
    weight?: number | null;
  }
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    if (data.shipmentId !== undefined && data.shipmentId !== null) {
      const inventoryItem = await prisma.warehouseInventoryItem.findUnique({
        where: { id: inventoryItemId },
        select: {
          id: true,
          purchaseOrderId: true,
          productId: true,
          productName: true,
          quantity: true,
          weight: true,
          status: true,
          shipmentId: true,
        },
      });

      if (!inventoryItem) return { success: false, error: "Inventory item not found" };
      if (inventoryItem.status !== "IN_WAREHOUSE") {
        return { success: false, error: "Only warehouse inventory can be assigned to shipments" };
      }

      const shipment = await prisma.warehouseShipment.findUnique({
        where: { id: data.shipmentId },
        select: { id: true, status: true },
      });

      if (!shipment) return { success: false, error: "Shipment not found" };
      if (shipment.status !== "PENDING_PACKING") {
        return { success: false, error: "Can only assign items to pending packing shipments" };
      }

      const assignQuantity = data.assignQuantity ?? inventoryItem.quantity;
      if (!Number.isInteger(assignQuantity) || assignQuantity < 1) {
        return { success: false, error: "Assign quantity must be at least 1" };
      }
      if (assignQuantity > inventoryItem.quantity) {
        return { success: false, error: "Assign quantity cannot exceed warehouse quantity" };
      }

      await prisma.$transaction(async (tx) => {
        const assignedWeight =
          data.weight !== undefined ? data.weight : inventoryItem.weight;
        const existingAssignedItem = await tx.warehouseInventoryItem.findFirst({
          where: {
            id: { not: inventoryItemId },
            shipmentId: data.shipmentId,
            purchaseOrderId: inventoryItem.purchaseOrderId,
            productId: inventoryItem.productId,
            status: "IN_WAREHOUSE",
            weight: assignedWeight,
          },
          select: { id: true, quantity: true },
        });

        if (existingAssignedItem) {
          await tx.warehouseInventoryItem.update({
            where: { id: existingAssignedItem.id },
            data: { quantity: existingAssignedItem.quantity + assignQuantity },
          });

          if (assignQuantity === inventoryItem.quantity) {
            await tx.warehouseInventoryItem.delete({ where: { id: inventoryItemId } });
          } else {
            await tx.warehouseInventoryItem.update({
              where: { id: inventoryItemId },
              data: { quantity: inventoryItem.quantity - assignQuantity },
            });
          }
          return;
        }

        if (assignQuantity === inventoryItem.quantity || inventoryItem.shipmentId) {
          await tx.warehouseInventoryItem.update({
            where: { id: inventoryItemId },
            data: {
              shipmentId: data.shipmentId,
              ...(data.weight !== undefined ? { weight: data.weight } : {}),
            },
          });
          return;
        }

        await tx.warehouseInventoryItem.update({
          where: { id: inventoryItemId },
          data: { quantity: inventoryItem.quantity - assignQuantity },
        });

        await tx.warehouseInventoryItem.create({
          data: {
            purchaseOrderId: inventoryItem.purchaseOrderId,
            productId: inventoryItem.productId,
            productName: inventoryItem.productName,
            quantity: assignQuantity,
            weight: assignedWeight,
            status: inventoryItem.status,
            shipmentId: data.shipmentId,
          },
        });
      });

      revalidatePath("/admin/warehouse");
      revalidatePath("/admin/warehouse/inventory");
      revalidatePath(`/admin/shipments/${data.shipmentId}`);
      revalidatePath(`/admin/purchase-orders/${inventoryItem.purchaseOrderId}`);
      return { success: true, data: { success: true } };
    }

    const existingItem = await prisma.warehouseInventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        shipmentId: true,
        purchaseOrderId: true,
        productId: true,
        quantity: true,
        weight: true,
        status: true,
      },
    });
    if (!existingItem) return { success: false, error: "Inventory item not found" };

    const updateData: Record<string, unknown> = {};
    if (data.shipmentId !== undefined) updateData.shipmentId = data.shipmentId;
    if (data.weight !== undefined) updateData.weight = data.weight;

    if (data.shipmentId === null && existingItem.shipmentId) {
      await prisma.$transaction(async (tx) => {
        const matchingWarehouseItem = await tx.warehouseInventoryItem.findFirst({
          where: {
            id: { not: inventoryItemId },
            shipmentId: null,
            purchaseOrderId: existingItem.purchaseOrderId,
            productId: existingItem.productId,
            status: existingItem.status,
            weight: data.weight !== undefined ? data.weight : existingItem.weight,
          },
          select: { id: true, quantity: true },
        });

        if (matchingWarehouseItem) {
          await tx.warehouseInventoryItem.update({
            where: { id: matchingWarehouseItem.id },
            data: { quantity: matchingWarehouseItem.quantity + existingItem.quantity },
          });
          await tx.warehouseInventoryItem.delete({ where: { id: inventoryItemId } });
          return;
        }

        await tx.warehouseInventoryItem.update({
          where: { id: inventoryItemId },
          data: updateData,
        });
      });
    } else {
      await prisma.warehouseInventoryItem.update({
        where: { id: inventoryItemId },
        data: updateData,
      });
    }

    revalidatePath("/admin/warehouse");
    revalidatePath("/admin/warehouse/inventory");
    if (existingItem.shipmentId) revalidatePath(`/admin/shipments/${existingItem.shipmentId}`);
    revalidatePath(`/admin/purchase-orders/${existingItem.purchaseOrderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update inventory item";
    return { success: false, error: message };
  }
}
