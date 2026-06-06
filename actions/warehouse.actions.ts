"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

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
  shippingRatePerKg: z.number().min(0),
  extraCost: z.number().min(0),
  notes: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  warehouseShipmentId: z.string(),
  status: z.enum(["PENDING_PACKING", "IN_TRANSIT", "DELIVERED"]),
});

const removeInventoryItemsSchema = z.object({
  warehouseShipmentId: z.string(),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});

export async function createWarehouseShipment(
  name?: string | null
): Promise<ActionResult<{ id: string; shipmentNumber: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const shipment = await prisma.warehouseShipment.create({
      data: {
        status: "PENDING_PACKING",
        ...(name ? { name } : {}),
      },
    });

    revalidatePath("/admin/warehouse");
    revalidatePath("/admin/shipments");
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
      select: { status: true },
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

      }
    }

    const shipmentInventory = await prisma.warehouseInventoryItem.findMany({
      where: { shipmentId: parsed.data.warehouseShipmentId },
      select: { quantity: true, weight: true },
    });

    const totalWeight = shipmentInventory.reduce(
      (sum, item) => sum + Number(item.weight ?? 0) * item.quantity,
      0
    );

    await prisma.warehouseShipment.update({
      where: { id: parsed.data.warehouseShipmentId },
      data: { totalWeight },
    });

    revalidatePath(`/admin/warehouse/${parsed.data.warehouseShipmentId}`);
    revalidatePath(`/admin/shipments/${parsed.data.warehouseShipmentId}`);
    revalidatePath("/admin/purchase-orders");
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
    const shipment = await prisma.warehouseShipment.findUnique({
      where: { id: parsed.data.warehouseShipmentId },
      select: {
        inventoryItems: { select: { quantity: true, weight: true } },
      },
    });

    if (!shipment) return { success: false, error: "Shipment not found" };

    const totalWeight = shipment.inventoryItems.reduce(
      (sum, item) => sum + Number(item.weight ?? 0) * item.quantity,
      0
    );
    const totalShippingCost = totalWeight * parsed.data.shippingRatePerKg + parsed.data.extraCost;

    await prisma.warehouseShipment.update({
      where: { id: parsed.data.warehouseShipmentId },
      data: {
        shippingRatePerKg: parsed.data.shippingRatePerKg,
        extraCost: parsed.data.extraCost,
        totalWeight,
        totalShippingCost,
        notes: parsed.data.notes ?? null,
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

export async function removeInventoryItemsFromShipment(
  input: z.infer<typeof removeInventoryItemsSchema>
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = removeInventoryItemsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  try {
    const shipment = await prisma.warehouseShipment.findUnique({
      where: { id: parsed.data.warehouseShipmentId },
      select: { id: true, status: true },
    });

    if (!shipment) return { success: false, error: "Shipment not found" };
    if (shipment.status !== "PENDING_PACKING") {
      return {
        success: false,
        error: "Can only remove inventory from a PENDING_PACKING shipment",
      };
    }

    const requestedById = new Map(
      parsed.data.items.map((item) => [item.inventoryItemId, item.quantity])
    );
    const inventoryItems = await prisma.warehouseInventoryItem.findMany({
      where: {
        id: { in: [...requestedById.keys()] },
        shipmentId: shipment.id,
        status: "IN_WAREHOUSE",
      },
      select: {
        id: true,
        purchaseOrderId: true,
        productId: true,
        productName: true,
        quantity: true,
        weight: true,
        status: true,
      },
    });

    if (inventoryItems.length !== requestedById.size) {
      return { success: false, error: "Some selected items are not assigned to this shipment" };
    }

    for (const item of inventoryItems) {
      const quantity = requestedById.get(item.id) ?? 0;
      if (quantity > item.quantity) {
        return {
          success: false,
          error: `Remove quantity for ${item.productName} cannot exceed assigned quantity`,
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of inventoryItems) {
        const quantity = requestedById.get(item.id) ?? 0;
        const matchingWarehouseItem = await tx.warehouseInventoryItem.findFirst({
          where: {
            id: { not: item.id },
            shipmentId: null,
            purchaseOrderId: item.purchaseOrderId,
            productId: item.productId,
            status: item.status,
            weight: item.weight,
          },
          select: { id: true, quantity: true },
        });

        if (matchingWarehouseItem) {
          await tx.warehouseInventoryItem.update({
            where: { id: matchingWarehouseItem.id },
            data: { quantity: matchingWarehouseItem.quantity + quantity },
          });

          if (quantity === item.quantity) {
            await tx.warehouseInventoryItem.delete({ where: { id: item.id } });
          } else {
            await tx.warehouseInventoryItem.update({
              where: { id: item.id },
              data: { quantity: item.quantity - quantity },
            });
          }
          continue;
        }

        if (quantity === item.quantity) {
          await tx.warehouseInventoryItem.update({
            where: { id: item.id },
            data: { shipmentId: null },
          });
        } else {
          await tx.warehouseInventoryItem.update({
            where: { id: item.id },
            data: { quantity: item.quantity - quantity },
          });

          await tx.warehouseInventoryItem.create({
            data: {
              purchaseOrderId: item.purchaseOrderId,
              productId: item.productId,
              productName: item.productName,
              quantity,
              weight: item.weight,
              status: item.status,
              shipmentId: null,
            },
          });
        }
      }
    });

    revalidatePath(`/admin/warehouse/${shipment.id}`);
    revalidatePath(`/admin/shipments/${shipment.id}`);
    revalidatePath("/admin/warehouse");
    revalidatePath("/admin/warehouse/inventory");
    revalidatePath("/admin/purchase-orders");
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to remove inventory from shipment";
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
      select: {
        status: true,
        _count: { select: { inventoryItems: true, packages: true } },
      },
    });

    if (!shipment) return { success: false, error: "Shipment not found" };

    const validTransitions: Record<string, string[]> = {
      PENDING_PACKING: ["IN_TRANSIT"],
      IN_TRANSIT: ["PENDING_PACKING", "DELIVERED"],
      DELIVERED: ["IN_TRANSIT"],
    };

    const allowed = validTransitions[shipment.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return {
        success: false,
        error: `Cannot transition from ${shipment.status} to ${parsed.data.status}`,
      };
    }

    if (
      (parsed.data.status === "IN_TRANSIT" || parsed.data.status === "DELIVERED") &&
      shipment._count.inventoryItems === 0 &&
      shipment._count.packages === 0
    ) {
      return {
        success: false,
        error: "Add at least one inventory item to this shipment before updating its status",
      };
    }

    const updateData: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === "IN_TRANSIT") updateData.shippedAt = new Date();
    if (parsed.data.status === "DELIVERED") updateData.deliveredAt = new Date();
    if (parsed.data.status === "PENDING_PACKING") updateData.shippedAt = null;
    if (shipment.status === "DELIVERED" && parsed.data.status === "IN_TRANSIT") {
      updateData.deliveredAt = null;
    }

    if (parsed.data.status === "DELIVERED") {
      await prisma.$transaction(async (tx) => {
        await tx.warehouseShipment.update({
          where: { id: parsed.data.warehouseShipmentId },
          data: updateData,
        });
        await handleShipmentDelivery(parsed.data.warehouseShipmentId, tx);
      });
    } else if (shipment.status === "DELIVERED" && parsed.data.status === "IN_TRANSIT") {
      await prisma.$transaction(async (tx) => {
        await reverseShipmentDelivery(parsed.data.warehouseShipmentId, tx);
        await tx.warehouseShipment.update({
          where: { id: parsed.data.warehouseShipmentId },
          data: updateData,
        });
      });
    } else {
      await prisma.warehouseShipment.update({
        where: { id: parsed.data.warehouseShipmentId },
        data: updateData,
      });
    }

    revalidatePath(`/admin/warehouse/${parsed.data.warehouseShipmentId}`);
    revalidatePath(`/admin/shipments/${parsed.data.warehouseShipmentId}`);
    revalidatePath("/admin/warehouse");
    revalidatePath("/admin/shipments");
    revalidatePath("/admin/purchase-orders");
    return { success: true, data: { success: true } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update status";
    return { success: false, error: message };
  }
}

async function handleShipmentDelivery(shipmentId: string, tx: Prisma.TransactionClient) {
  const shipment = await tx.warehouseShipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      inventoryItems: {
        where: { status: "IN_WAREHOUSE" },
        select: { id: true, purchaseOrderId: true, productId: true, quantity: true },
      },
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
  const deliveredInventoryItems = shipment.inventoryItems;

  if (deliveredInventoryItems.length > 0) {
    for (const item of deliveredInventoryItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });

      await tx.warehouseInventoryItem.update({
        where: { id: item.id },
        data: { status: "DELIVERED" },
      });
    }

    const affectedPairs = deliveredInventoryItems.map((item) => ({
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
    }));
    const affectedPOItems = await tx.purchaseOrderItem.findMany({
      where: { OR: affectedPairs },
      include: {
        preOrderItems: {
          include: {
            orderItem: {
              include: { order: { select: { id: true, status: true } } },
            },
          },
        },
      },
    });

    for (const poItem of affectedPOItems) {
      for (const preOrder of poItem.preOrderItems) {
        orderIdsToCheck.add(preOrder.orderItem.order.id);
      }
    }
  } else {
    for (const pkg of shipment.packages) {
      for (const item of pkg.items) {
        const poItem = item.purchaseOrderItem;

        // Increment product stock
        await tx.product.update({
          where: { id: poItem.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Archive warehouse inventory items for this product/PO
        // Mark them as DELIVERED so they no longer appear as active inventory
        await tx.warehouseInventoryItem.updateMany({
          where: {
            purchaseOrderId: poItem.purchaseOrderId,
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
  }

  // Re-evaluate order statuses. An order can move from AWAITING_STOCK
  // to PROCESSING when ALL of its pre-order items have been fulfilled
  // (i.e., the linked PO items have been fully received).
  for (const orderId of orderIdsToCheck) {
    const order = await tx.order.findUnique({
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
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PROCESSING" },
      });
    }
  }
}

async function reverseShipmentDelivery(shipmentId: string, tx: Prisma.TransactionClient) {
  const shipment = await tx.warehouseShipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      inventoryItems: {
        where: { status: "DELIVERED" },
        select: { id: true, purchaseOrderId: true, productId: true, quantity: true },
      },
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
  const deliveredInventoryItems = shipment.inventoryItems;

  if (deliveredInventoryItems.length > 0) {
    for (const item of deliveredInventoryItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });

      await tx.warehouseInventoryItem.update({
        where: { id: item.id },
        data: { status: "IN_WAREHOUSE" },
      });
    }

    const affectedPairs = deliveredInventoryItems.map((item) => ({
      purchaseOrderId: item.purchaseOrderId,
      productId: item.productId,
    }));
    const affectedPOItems = await tx.purchaseOrderItem.findMany({
      where: { OR: affectedPairs },
      include: {
        preOrderItems: {
          include: {
            orderItem: {
              include: { order: { select: { id: true, status: true } } },
            },
          },
        },
      },
    });

    for (const poItem of affectedPOItems) {
      for (const preOrder of poItem.preOrderItems) {
        orderIdsToCheck.add(preOrder.orderItem.order.id);
      }
    }
  } else {
    for (const pkg of shipment.packages) {
      for (const item of pkg.items) {
        const poItem = item.purchaseOrderItem;

        await tx.product.update({
          where: { id: poItem.productId },
          data: { stock: { decrement: item.quantity } },
        });

        for (const preOrder of poItem.preOrderItems) {
          orderIdsToCheck.add(preOrder.orderItem.order.id);
        }
      }
    }
  }

  for (const orderId of orderIdsToCheck) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { id: true, stock: true } },
            preOrderItems: true,
          },
        },
      },
    });

    if (!order || order.status !== "PROCESSING") continue;

    const hasStockGap = order.items.some((item) => item.product.stock < item.quantity);
    if (hasStockGap) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "AWAITING_STOCK" },
      });
    }
  }
}

export async function getWarehouseShipments() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const shipments = await prisma.warehouseShipment.findMany({
    select: {
      id: true,
      name: true,
      shipmentNumber: true,
      status: true,
      shippingRatePerKg: true,
      extraCost: true,
      totalShippingCost: true,
      notes: true,
      shippedAt: true,
      deliveredAt: true,
      createdAt: true,
      updatedAt: true,
      inventoryItems: { select: { quantity: true, weight: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return shipments.map((s) => ({
    id: s.id,
    name: s.name,
    shipmentNumber: s.shipmentNumber,
    status: s.status,
    totalWeight: s.inventoryItems.reduce(
      (sum, item) => sum + Number(item.weight ?? 0) * item.quantity,
      0
    ),
    shippingRatePerKg: s.shippingRatePerKg ? Number(s.shippingRatePerKg) : null,
    extraCost: s.extraCost ? Number(s.extraCost) : null,
    totalShippingCost: s.shippingRatePerKg
      ? s.inventoryItems.reduce((sum, item) => sum + Number(item.weight ?? 0) * item.quantity, 0) *
          Number(s.shippingRatePerKg) +
        Number(s.extraCost ?? 0)
      : s.totalShippingCost
        ? Number(s.totalShippingCost)
        : null,
    notes: s.notes,
    shippedAt: s.shippedAt,
    deliveredAt: s.deliveredAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    inventoryItemCount: s.inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export async function getWarehouseShipmentById(id: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const shipment = await prisma.warehouseShipment.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      shipmentNumber: true,
      status: true,
      shippingRatePerKg: true,
      extraCost: true,
      totalShippingCost: true,
      notes: true,
      shippedAt: true,
      deliveredAt: true,
      createdAt: true,
      inventoryItems: {
        select: {
          id: true,
          productName: true,
          productId: true,
          quantity: true,
          weight: true,
          status: true,
          purchaseOrderId: true,
          purchaseOrder: { select: { id: true, poNumber: true, supplierName: true } },
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
    },
  });

  if (!shipment) return null;

  return {
    ...shipment,
    totalWeight: shipment.inventoryItems.reduce(
      (sum, item) => sum + Number(item.weight ?? 0) * item.quantity,
      0
    ),
    shippingRatePerKg: shipment.shippingRatePerKg ? Number(shipment.shippingRatePerKg) : null,
    extraCost: shipment.extraCost ? Number(shipment.extraCost) : null,
    totalShippingCost: shipment.shippingRatePerKg
      ? shipment.inventoryItems.reduce(
          (sum, item) => sum + Number(item.weight ?? 0) * item.quantity,
          0
        ) *
          Number(shipment.shippingRatePerKg) +
        Number(shipment.extraCost ?? 0)
      : shipment.totalShippingCost
        ? Number(shipment.totalShippingCost)
        : null,
    inventoryItems: shipment.inventoryItems.map((item) => ({
      id: item.id,
      productName: item.productName,
      productId: item.productId,
      purchaseOrderId: item.purchaseOrderId,
      purchaseOrder: item.purchaseOrder,
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
