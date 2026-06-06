import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPurchaseOrderById } from "@/actions/purchase-order.actions";
import { PurchaseOrderDetailClient } from "./PurchaseOrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const purchaseOrder = await getPurchaseOrderById(id);

  if (!purchaseOrder) {
    redirect("/admin/purchase-orders");
  }

  return <PurchaseOrderDetailClient purchaseOrder={purchaseOrder as any} />;
}
