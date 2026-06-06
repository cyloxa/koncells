import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWarehouseInventory } from "@/actions/purchase-order.actions";
import { prisma } from "@/lib/prisma";
import { WarehouseInventoryTable } from "./inventory/WarehouseInventoryTable";

export default async function WarehousePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const items = await getWarehouseInventory();

  const prismaShipments = await prisma.warehouseShipment.findMany({
    where: { status: { not: "DELIVERED" as const } },
    select: {
      id: true,
      name: true,
      shipmentNumber: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <WarehouseInventoryTable
        initialItems={items as any}
        shipments={prismaShipments}
      />
    </div>
  );
}
