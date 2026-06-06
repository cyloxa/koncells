"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const addPackageSchema = z.object({
  warehouseShipmentId: z.string(),
  weight: z.number().min(0.01, "Weight must be greater than 0"),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});

const updateCostsSchema = z.object({
  warehouseShipmentId: z.string(),
  baseShippingCost: z.number().min(0),
  extraCost: z.number().min(0),
});

const updateStatusSchema = z.object({
  warehouseShipmentId: z.string(),
  status: z.enum(["PACKED", "IN_TRANSIT", "DELIVERED"]),
});

export async function createWarehouseShipment(
  purchaseOrderId: string,
  name?: string | null
): Promise<ActionResult<{ id: string; shipmentNumber: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: { status: true },
    });

    if (!po) return { success: false, error: "Purchase order not found" };
    if (po.status !== "PARTIAL" && po.status !== "RECEIVED") {
      return {
        success: false,
        error: "Purchase order must be at least PARTIALLY received before creating shipment",
      };
    }

    const shipment = await prisma.warehouseShipment.create({
      data: {
        purchaseOrderId,
        status: "PENDING_PACKING",
        ...(name ? { name } : {}),
      },
    });

    revalidatePath("/admin/warehouse");
    revalidatePath("/admin/shipments");
    revalidatePath(`/admin/purchase-orders/${purchaseOrderId}`);
    return {
      success: true,
      data: { id: shipment.id, shipmentNumber: shipment.shipmentNumber },
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create shipment";
    return { success: false, error: message };
  }
}

export async function addPackageToShipment(
  input: z.infer<typeof addPackageSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = addPackageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  try {
    const shipment = await prisma.warehouseShipment.findUnique({
      where: { id: parsed.data.warehouseShipmentId },
      select: { status: true, purchaseOrderId: true },
    });

    if (!shipment) return { success: false, error: "Shipment not found" };
    if (shipment.status !== "PENDING_PACKING") {
      return { success: false, error: "Can only add packages to a PENDING_PACKING shipment" };
    }

    await prisma.warehousePackage.create({
      data: {
        warehouseShipmentId: parsed.data.warehouseShipmentId,
        weight: parsed.data.weight,
        notes: parsed.data.notes ?? null,
        items: {
          create: parsed.data.items.map((item) => ({
            purchaseOrderItemId: item.purchaseOrderItemId,
            quantity: item.quantity,
          })),
        },
      },
    });

    // Update quantityReceived on PurchaseOrderItems and check if any are now fully received
    for (const item of parsed.data.items) {
      const poItem = await prisma.purchaseOrderItem.findUnique({
        where: { id: item.purchaseOrderItemId },
        select: { quantity: true, quantityReceived: true },
      });
      if (poItem) {
        const newReceived = poItem.quantityReceived + item.quantity;
        await prisma.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: { quantityReceived: newReceived },
        });

        // Check if all items in PO are fully received -> auto-transition to RECEIVED
        if (newReceived >= poItem.quantity) {
          const allItems = await prisma.purchaseOrderItem.findMany({
            where: { purchaseOrderId: shipment.purchaseOrderId },
            select: { quantity: true, quantityReceived: true },
          });

          const allReceived = allItems.every((i) => i.quantityReceived >= i.quantity);
          if (allReceived) {
            await prisma.purchaseOrder.update({
              where: { id: shipment.purchaseOrderId },
              data: { status: "RECEIVED", receivedAt: new Date() },
            });
          } else {
            await prisma.purchaseOrder.update({
              where: { id: shipment.purchaseOrderId },
              data: { status: "PARTIAL" },
            });
          }
        }
      }
    }

    // Recalculate shipment total weight
    const allPackages = await prisma.warehousePackage.findMany({
      where: { warehouseShipmentId: parsed.data.warehouseShipmentId },
    });

    const totalWeight = allPackages.reduce((sum, pkg) => sum + Number(pkg.weight), 0);

    await prisma.warehouseShipment.update({
      where: { id: parsed.data.warehouseShipmentId },
      data: { totalWeight },
    });

    revalidatePath(`/admin/warehouse/${parsed.data.warehouseShipmentId}`);
    revalidatePath(`/admin/shipments/${parsed.data.warehouseShipmentId}`);
    revalidatePath(`/admin/purchase-orders/${shipment.purchaseOrderId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to add package";
    return { success: false, error: message };
  }
}

export async function updateShipmentCosts(
  input: z.infer<typeof updateCostsSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = updateCostsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const totalShippingCost = parsed.data.baseShippingCost + parsed.data.extraCost;

    await prisma.warehouseShipment.update({
      where: { id: parsed.data.warehouseShipmentId },
      data: {
        baseShippingCost: parsed.data.baseShippingCost,
        extraCost: parsed.data.extraCost,
        totalShippingCost,
      },
    });

    revalidatePath(`/admin/warehouse/${parsed.data.warehouseShipmentId}`);
    revalidatePath(`/admin/shipments/${parsed.data.warehouseShipmentId}`);
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update costs";
    return { success: false, error: message };
  }
}

export async function updateShipmentStatus(
  input: z.infer<typeof updateStatusSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const shipment = await prisma.warehouseShipment.findUnique({
      where: { id: parsed.data.warehouseShipmentId },
      select: { status: true },
    });

    if (!shipment) return { success: false, error: "Shipment not found" };

    const validTransitions: Record<string, string[]> = {
      PENDING_PACKING: ["PACKED"],
      PACKED: ["IN_TRANSIT"],
      IN_TRANSIT: ["DELIVERED"],
    };

    const allowed = validTransitions[shipment.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return {
        success: false,
        error: `Cannot transition from ${shipment.status} to ${parsed.data.status}`,
      };
    }

    const updateData: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === "PACKED") updateData.packedAt = new Date();
    if (parsed.data.status === "IN_TRANSIT") updateData.shippedAt = new Date();
    if (parsed.data.status === "DELIVERED") updateData.deliveredAt = new Date();

    await prisma.warehouseShipment.update({
      where: { id: parsed.data.warehouseShipmentId },
      data: updateData,
    });

    // If DELIVERED, increment stock and fulfill pre-orders
    if (parsed.data.status === "DELIVERED") {
      await handleShipmentDelivery(parsed.data.warehouseShipmentId);
    }

    revalidatePath(`/admin/warehouse/${parsed.data.warehouseShipmentId}`);
    revalidatePath(`/admin/shipments/${parsed.data.warehouseShipmentId}`);
    revalidatePath("/admin/warehouse");
    revalidatePath("/admin/shipments");
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update status";
    return { success: false, error: message };
  }
}

async function handleShipmentDelivery(shipmentId: string) {
  const shipment = await prisma.warehouseShipment.findUnique({
    where: { id: shipmentId },
    include: {
      packages: {
        include: {
          items: {
            include: {
              purchaseOrderItem: {
                include: {
                  preOrderItems: {
                    include: {
                      orderItem: {
                        include: { order: { select: { id: true, status: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!shipment) return;

  const orderIdsToCheck = new Set<string>();

  for (const pkg of shipment.packages) {
    for (const item of pkg.items) {
      const poItem = item.purchaseOrderItem;

      // Increment product stock
      await prisma.product.update({
        where: { id: poItem.productId },
        data: { stock: { increment: item.quantity } },
      });

      // Archive warehouse inventory items for this product/PO
      // Mark them as DELIVERED so they no longer appear as active inventory
      await prisma.warehouseInventoryItem.updateMany({
        where: {
          purchaseOrderId: shipment.purchaseOrderId,
          productId: poItem.productId,
          status: "IN_WAREHOUSE",
        },
        data: { status: "DELIVERED" },
      });

      // Collect affected orders for status re-evaluation
      for (const preOrder of poItem.preOrderItems) {
        orderIdsToCheck.add(preOrder.orderItem.order.id);
      }
    }
  }

  // Re-evaluate order statuses. An order can move from AWAITING_STOCK
  // to PROCESSING when ALL of its pre-order items have been fulfilled
  // (i.e., the linked PO items have been fully received).
  for (const orderId of orderIdsToCheck) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { id: true, stock: true } },
            preOrderItems: {
              include: {
                purchaseOrderItem: {
                  select: { quantity: true, quantityReceived: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) continue;

    // An order is fully fulfillable when:
    //   - Every OrderItem that is NOT a pre-order has stock available
    //   - Every OrderItem that IS a pre-order has all its PO items fully received
    let allItemsReady = true;

    for (const orderItem of order.items) {
      if (orderItem.preOrderItems.length > 0) {
        // Pre-order item: check if all linked PO items are fully received
        const allReceived = orderItem.preOrderItems.every(
          (po) => po.purchaseOrderItem.quantityReceived >= po.purchaseOrderItem.quantity
        );
        if (!allReceived) {
          allItemsReady = false;
          break;
        }
      } else {
        // Regular item: check stock availability
        if (orderItem.product.stock < orderItem.quantity) {
          allItemsReady = false;
          break;
        }
      }
    }

    if (allItemsReady && order.status === "AWAITING_STOCK") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PROCESSING" },
      });
    }
  }
}

export async function getWarehouseShipments() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const shipments = await prisma.warehouseShipment.findMany({
    include: {
      purchaseOrder: { select: { id: true, poNumber: true, supplierName: true } },
      packages: { select: { id: true, weight: true } },
      _count: { select: { inventoryItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return shipments.map((s) => ({
    id: s.id,
    name: s.name,
    shipmentNumber: s.shipmentNumber,
    status: s.status,
    totalWeight: s.totalWeight ? Number(s.totalWeight) : null,
    baseShippingCost: s.baseShippingCost ? Number(s.baseShippingCost) : null,
    extraCost: s.extraCost ? Number(s.extraCost) : null,
    totalShippingCost: s.totalShippingCost ? Number(s.totalShippingCost) : null,
    notes: s.notes,
    packedAt: s.packedAt,
    shippedAt: s.shippedAt,
    deliveredAt: s.deliveredAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    purchaseOrder: s.purchaseOrder,
    packages: s.packages.map((pkg) => ({
      id: pkg.id,
      weight: Number(pkg.weight),
    })),
    inventoryItemCount: s._count.inventoryItems,
  }));
}

export async function getWarehouseShipmentById(id: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const shipment = await prisma.warehouseShipment.findUnique({
    where: { id },
    include: {
      purchaseOrder: {
        select: { id: true, poNumber: true, supplierName: true, status: true },
      },
      inventoryItems: {
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
        },
        orderBy: { createdAt: "desc" },
      },
      packages: {
        include: {
          items: {
            include: {
              purchaseOrderItem: {
                select: {
                  id: true,
                  productName: true,
                  productSku: true,
                  productId: true,
                  quantity: true,
                  quantityReceived: true,
                  product: { select: { name: true, slug: true, weight: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!shipment) return null;

  return {
    ...shipment,
    totalWeight: shipment.totalWeight ? Number(shipment.totalWeight) : null,
    baseShippingCost: shipment.baseShippingCost ? Number(shipment.baseShippingCost) : null,
    extraCost: shipment.extraCost ? Number(shipment.extraCost) : null,
    totalShippingCost: shipment.totalShippingCost ? Number(shipment.totalShippingCost) : null,
    inventoryItems: shipment.inventoryItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      productId: item.productId,
      quantity: item.quantity,
      weight: item.weight ? Number(item.weight) : null,
      status: item.status,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            weight: item.product.weight ? Number(item.product.weight) : null,
            images: item.product.images,
          }
        : null,
    })),
    packages: shipment.packages.map((pkg) => ({
      ...pkg,
      weight: Number(pkg.weight),
      items: pkg.items.map((item) => ({
        ...item,
        purchaseOrderItem: {
          ...item.purchaseOrderItem,
          product: item.purchaseOrderItem.product
            ? {
                ...item.purchaseOrderItem.product,
                weight: item.purchaseOrderItem.product.weight
                  ? Number(item.purchaseOrderItem.product.weight)
                  : null,
              }
            : undefined,
        },
      })),
    })),
  };
}

export async function getPendingWarehouseItems(purchaseOrderId: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const poItems = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId },
    include: {
      product: { select: { id: true, name: true, slug: true, weight: true } },
    },
  });

  return poItems
    .map((item) => ({
      ...item,
      unitPriceCny: Number(item.unitPriceCny),
      lineTotalCny: Number(item.lineTotalCny),
      remaining: item.quantity - item.quantityReceived,
    }))
    .filter((item) => item.remaining > 0);
}

// ─── Bulk Delete Shipments ────────────────────────────

export async function deleteWarehouseShipments(
  ids: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (!ids.length) return { success: false, error: "No shipments selected" };

  try {
    // Unlink inventory items from these shipments first (SET NULL constraint)
    await prisma.warehouseInventoryItem.updateMany({
      where: { shipmentId: { in: ids } },
      data: { shipmentId: null },
    });

    // Packages and package items are cascade-deleted by Prisma
    await prisma.warehouseShipment.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/admin/shipments");
    revalidatePath("/admin/warehouse");
    return { success: true, data: { count: ids.length } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete shipments";
    return { success: false, error: message };
  }
}
