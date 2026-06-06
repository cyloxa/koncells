import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWarehouseShipments } from "@/actions/warehouse.actions";
import { WarehouseShipmentsTable } from "../warehouse/WarehouseShipmentsTable";

export default async function ShipmentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const shipments = await getWarehouseShipments();

  return (
    <div className="p-6">
      <WarehouseShipmentsTable initialShipments={shipments} />
    </div>
  );
}
