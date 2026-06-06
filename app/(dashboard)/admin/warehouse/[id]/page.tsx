import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWarehouseShipmentById } from "@/actions/warehouse.actions";
import { WarehouseDetailClient } from "./WarehouseDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WarehouseDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const shipment = await getWarehouseShipmentById(id);

  if (!shipment) {
    redirect("/admin/warehouse");
  }

  return <WarehouseDetailClient shipment={shipment as any} />;
}
