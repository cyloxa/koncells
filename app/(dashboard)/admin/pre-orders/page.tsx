import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPreOrders } from "@/actions/pre-order.actions";
import { PreOrdersClient } from "./PreOrdersClient";

export default async function PreOrdersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const preOrders = await getPreOrders();

  return (
    <div className="p-6">
      <PreOrdersClient initialPreOrders={preOrders as any} />
    </div>
  );
}
