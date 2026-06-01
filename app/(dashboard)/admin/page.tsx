import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BarChart3, Package, ShoppingCart, Users, DollarSign } from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [totalProducts, totalOrders, totalUsers, recentOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const totalRevenue = await prisma.order.aggregate({
    _sum: { total: true },
    where: { status: { not: "CANCELLED" } },
  });

  const stats = [
    {
      label: "Total Revenue",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        Number(totalRevenue._sum.total ?? 0)
      ),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Total Products",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Orders",
      value: totalOrders,
      icon: ShoppingCart,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your store</p>
        </div>
        <Link
          href="/admin/products"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Manage Products →
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            View All
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Order ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4">{order.user.name ?? order.user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "DELIVERED"
                            ? "bg-green-100 text-green-700"
                            : order.status === "PROCESSING"
                            ? "bg-blue-100 text-blue-700"
                            : order.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
