import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getAdminOrderById, getPreOrdersForOrder } from "@/actions/order.actions";
import { OrderDetailClient } from "./OrderDetailClient";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const [order, preOrders] = await Promise.all([
    getAdminOrderById(id),
    getPreOrdersForOrder(id),
  ]);
  if (!order) notFound();

  return <OrderDetailClient order={order as any} preOrders={preOrders as any} />;
}
