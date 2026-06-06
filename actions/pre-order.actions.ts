"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPreOrders() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const preOrders = await prisma.preOrderItem.findMany({
    include: {
      orderItem: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, sku: true, images: { take: 1 } },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      purchaseOrderItem: {
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true, supplierName: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return preOrders.map((po) => ({
    id: po.id,
    quantity: po.quantity,
    createdAt: po.createdAt,
    orderItem: {
      id: po.orderItem.id,
      quantity: po.orderItem.quantity,
      price: Number(po.orderItem.price),
      costs: po.orderItem.costs ? Number(po.orderItem.costs) : null,
      profit: po.orderItem.profit ? Number(po.orderItem.profit) : null,
      discount: po.orderItem.discount ? Number(po.orderItem.discount) : null,
      competitorsPrice: po.orderItem.competitorsPrice ? Number(po.orderItem.competitorsPrice) : null,
      globalPrice: po.orderItem.globalPrice ? Number(po.orderItem.globalPrice) : null,
      basePrice: po.orderItem.basePrice ? Number(po.orderItem.basePrice) : null,
      orderId: po.orderItem.orderId,
      productId: po.orderItem.productId,
      product: po.orderItem.product,
      order: po.orderItem.order,
    },
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

export async function getPendingPreOrders() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  // Fetch all pre-order items and filter client-side for pending ones
  const all = await prisma.preOrderItem.findMany({
    include: {
      orderItem: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          order: {
            select: { id: true, orderNumber: true, status: true },
          },
        },
      },
      purchaseOrderItem: {
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true, supplierName: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pending = all.filter(
    (po) => po.purchaseOrderItem.quantityReceived < po.purchaseOrderItem.quantity
  );

  return pending.map((po) => ({
    id: po.id,
    quantity: po.quantity,
    createdAt: po.createdAt,
    orderItem: {
      id: po.orderItem.id,
      quantity: po.orderItem.quantity,
      price: Number(po.orderItem.price),
      product: po.orderItem.product,
      order: po.orderItem.order,
    },
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

export async function getPreOrdersForOrder(orderId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const preOrders = await prisma.preOrderItem.findMany({
    where: { orderItem: { orderId } },
    include: {
      purchaseOrderItem: {
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true, supplierName: true, status: true },
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

export async function getPreOrdersCount() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return 0;

  // Count pre-order items where the linked PO item hasn't been fully received yet
  const preOrderItems = await prisma.preOrderItem.findMany({
    select: { id: true, purchaseOrderItem: { select: { quantity: true, quantityReceived: true } } },
  });

  return preOrderItems.filter(
    (item) => item.purchaseOrderItem.quantityReceived < item.purchaseOrderItem.quantity
  ).length;
}

export async function createPurchaseOrderFromPreOrders(
  preOrderItemIds: string[]
): Promise<
  | { success: true; data: { poId: string; poNumber: number } }
  | { success: false; error: string }
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (preOrderItemIds.length === 0) return { success: false, error: "No pre-orders selected" };

  try {
    // Get the exchange rate
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: { source: "CNY", target: "LKR", isDefault: true },
      orderBy: { createdAt: "desc" },
    });

    if (!exchangeRate) return { success: false, error: "No CNY to LKR exchange rate configured" };

    const rate = Number(exchangeRate.rate);

    // Get all pre-order items with their product info
    const preOrders = await prisma.preOrderItem.findMany({
      where: { id: { in: preOrderItemIds } },
      include: {
        orderItem: { select: { productId: true, orderId: true } },
        purchaseOrderItem: {
          select: {
            productId: true,
            productName: true,
            productSku: true,
            unitPriceCny: true,
            purchaseOrder: {
              select: { supplierName: true },
            },
          },
        },
      },
    });

    if (preOrders.length === 0) return { success: false, error: "No pre-order items found" };

    // Group by product to create PO items
    const productGroups = new Map<
      string,
      { productId: string; name: string; sku: string; unitPriceCny: number; qty: number }
    >();

    for (const po of preOrders) {
      const key = po.purchaseOrderItem.productId;
      const existing = productGroups.get(key);
      if (existing) {
        existing.qty += po.quantity;
      } else {
        productGroups.set(key, {
          productId: po.purchaseOrderItem.productId,
          name: po.purchaseOrderItem.productName,
          sku: po.purchaseOrderItem.productSku,
          unitPriceCny: Number(po.purchaseOrderItem.unitPriceCny),
          qty: po.quantity,
        });
      }
    }

    // Use first pre-order's supplier info
    const firstSupplier = preOrders[0].purchaseOrderItem.purchaseOrder?.supplierName ?? "";
    const defaultSupplier = firstSupplier;

    let totalCny = 0;
    let totalLkr = 0;

    const itemsData = Array.from(productGroups.values()).map((g) => {
      const lineCny = g.unitPriceCny * g.qty;
      const lineLkr = lineCny * rate;
      totalCny += lineCny;
      totalLkr += lineLkr;
      return {
        productId: g.productId,
        productName: g.name,
        productSku: g.sku,
        quantity: g.qty,
        unitPriceCny: g.unitPriceCny,
        lineTotalCny: lineCny,
        lineTotalLkr: lineLkr,
      };
    });

    // Also include product name from the first pre-order item
    const supplierName = preOrders
      .map((po) => po.purchaseOrderItem.purchaseOrder?.supplierName)
      .filter(Boolean)
      .find(() => true) ?? "Unknown Supplier";

    const po = await prisma.purchaseOrder.create({
      data: {
        supplierName: supplierName || "Unknown Supplier",
        totalCny,
        exchangeRate: rate,
        totalLkr,
        status: "PENDING",
        items: { create: itemsData },
      },
    });

    // Link pre-order items to the new PO items
    // For simplicity, link to the first matching PO item per product
    for (const [productId, group] of productGroups.entries()) {
      const poItem = await prisma.purchaseOrderItem.findFirst({
        where: { purchaseOrderId: po.id, productId },
      });

      if (poItem) {
        const preOrdersForProduct = preOrders.filter(
          (p) => p.purchaseOrderItem.productId === productId
        );

        for (const preOrderItem of preOrdersForProduct) {
          await prisma.preOrderItem.update({
            where: { id: preOrderItem.id },
            data: { purchaseOrderItemId: poItem.id },
          });
        }
      }
    }

    // Update related orders to AWAITING_STOCK
    const orderIds = new Set(preOrders.map((p) => p.orderItem.orderId).filter(Boolean));
    for (const orderId of orderIds) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "AWAITING_STOCK" },
      });
    }

    revalidatePath("/admin/pre-orders");
    revalidatePath("/admin/purchase-orders");
    return { success: true, data: { poId: po.id, poNumber: po.poNumber } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create purchase order";
    return { success: false, error: message };
  }
}
