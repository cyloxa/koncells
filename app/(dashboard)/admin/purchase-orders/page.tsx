import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPurchaseOrders } from "@/actions/purchase-order.actions";
import { PurchaseOrdersTable } from "./PurchaseOrdersTable";

export default async function PurchaseOrdersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const orders = await getPurchaseOrders();

  return (
    <div className="p-6">
      <PurchaseOrdersTable initialOrders={orders} />
    </div>
  );
}
