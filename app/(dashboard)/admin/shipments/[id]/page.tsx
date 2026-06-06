import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWarehouseShipmentById } from "@/actions/warehouse.actions";
import { WarehouseDetailClient } from "../../warehouse/[id]/WarehouseDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const shipment = await getWarehouseShipmentById(id);

  if (!shipment) {
    redirect("/admin/shipments");
  }

  return <WarehouseDetailClient shipment={shipment as any} />;
}
