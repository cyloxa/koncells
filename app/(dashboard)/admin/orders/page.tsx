import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 text-sm mt-1">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Order</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Items</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs text-indigo-600 hover:text-indigo-500"
                    >
                      #{order.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">
                      {order.user.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">{order.user.email}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[order.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(order.total))}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
