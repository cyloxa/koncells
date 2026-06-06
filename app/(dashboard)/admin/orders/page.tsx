import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminOrders } from "@/actions/order.actions";
import AdminOrdersTable from "./AdminOrdersTable";

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const orders = await getAdminOrders();

  return (
    <div className="p-6">
      <AdminOrdersTable initialOrders={orders} />
    </div>
  );
}
