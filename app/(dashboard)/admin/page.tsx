import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ClipboardList,
  Warehouse,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { getPreOrdersCount } from "@/actions/pre-order.actions";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  PREORDER: "bg-indigo-100 text-indigo-700",
  AWAITING_STOCK: "bg-orange-100 text-orange-700",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalProducts,
    totalOrders,
    totalUsers,
    recentOrders,
    recentUsers,
    lastMonthOrders,
    topProducts,
    ordersByStatus,
    activeProducts,
    lowStockProductsDetailed,
    totalReviews,
    pendingPreOrders,
    openPurchaseOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
    prisma.order.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.product.findMany({
      take: 5,
      orderBy: { orderItems: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
        _count: { select: { orderItems: true, reviews: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        reservedStock: true,
        lowStockThreshold: true,
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.review.count(),
    getPreOrdersCount(),
    prisma.purchaseOrder.count({
      where: { status: { in: ["PENDING", "ORDERED", "SHIPPED", "PARTIAL"] } },
    }),
  ]);

  const lowStockItems = lowStockProductsDetailed
    .map((p) => ({
      ...p,
      available: p.stock - p.reservedStock,
      threshold: p.lowStockThreshold ?? 10,
    }))
    .filter((p) => p.available <= p.threshold)
    .slice(0, 10);

  const totalRevenue = await prisma.order.aggregate({
    _sum: { total: true },
    where: { status: { not: "CANCELLED" } },
  });

  const lastMonthRevenue = await prisma.order.aggregate({
    _sum: { total: true },
    where: {
      status: { not: "CANCELLED" },
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const revenue = Number(totalRevenue._sum.total ?? 0);
  const lastMonthRev = Number(lastMonthRevenue._sum.total ?? 0);
  const revenueChange =
    lastMonthRev > 0
      ? Math.round(((revenue - lastMonthRev) / lastMonthRev) * 100)
      : 0;

  const stats = [
    {
      label: "Total Revenue",
      value: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(revenue),
      sub: `${revenueChange >= 0 ? "+" : ""}${revenueChange}% vs last 30 days`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
      trend: revenueChange >= 0 ? TrendingUp : TrendingDown,
      trendColor: revenueChange >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Total Products",
      value: totalProducts,
      sub: `${activeProducts} active`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Orders",
      value: totalOrders,
      sub: `${lastMonthOrders} in last 30 days`,
      icon: ShoppingCart,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      label: "Total Users",
      value: totalUsers,
      sub: `${totalReviews} reviews written`,
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">
            Comprehensive overview of your store performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last updated: {now.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              {"trend" in stat && stat.trend && (
                <stat.trend className={`h-4 w-4 ${stat.trendColor}`} />
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/pre-orders" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Pre-Orders</p>
                <p className="text-xl font-bold text-gray-900">{pendingPreOrders}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/admin/purchase-orders" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open Purchase Orders</p>
                <p className="text-xl font-bold text-gray-900">{openPurchaseOrders}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/admin/warehouse" className="block">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Warehouse className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Warehouse</p>
                <p className="text-xl font-bold text-gray-900">Manage</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-3">
            {ordersByStatus.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              ordersByStatus.map((status) => {
                const sColors: Record<string, string> = {
                  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
                  PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
                  SHIPPED: "bg-purple-100 text-purple-700 border-purple-200",
                  DELIVERED: "bg-green-100 text-green-700 border-green-200",
                  CANCELLED: "bg-red-100 text-red-700 border-red-200",
                  PREORDER: "bg-indigo-100 text-indigo-700 border-indigo-200",
                  AWAITING_STOCK: "bg-orange-100 text-orange-700 border-orange-200",
                };
                return (
                  <div
                    key={status.status}
                    className={`flex items-center justify-between p-3 rounded-lg border ${sColors[status.status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                  >
                    <span className="text-sm font-medium">{status.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{status._count.id}</span>
                      <span className="text-xs opacity-75">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(status._sum.total ?? 0))}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <Link
              href="/admin/products"
              className="text-xs text-brand hover:text-brand"
            >
              View All
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">No products yet.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">
                    {index + 1}.
                  </span>
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product._count.orderItems} sold &middot; {product._count.reviews} reviews
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(product.price))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link
              href="/admin/customers"
              className="text-xs text-brand hover:text-brand"
            >
              View All
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users yet.</p>
          ) : (
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-brand">
                      {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock & Auto-Restock */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Low Stock Products</h2>
          {lowStockItems.length > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {lowStockItems.length} products
            </span>
          )}
        </div>
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-gray-500">All products are well-stocked.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">Product</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-600">SKU</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">Stock</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">Reserved</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">Available</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">Threshold</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-7 w-7 rounded object-cover"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded bg-gray-200" />
                        )}
                        <span className="font-medium text-gray-900 truncate max-w-[180px]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600">
                      {product.sku}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                      {product.stock}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-orange-600">
                      {product.reservedStock}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-red-600">
                      {product.available}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500">
                      {product.threshold}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={{
                          pathname: "/admin/purchase-orders/create",
                          query: { productId: product.id },
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-dark transition-colors"
                      >
                        Create Purchase Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-brand hover:text-brand inline-flex items-center gap-1"
          >
            View All
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm px-6 pb-6">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Order</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const sColors: Record<string, string> = {
                    PENDING: "bg-yellow-100 text-yellow-700",
                    PROCESSING: "bg-blue-100 text-blue-700",
                    SHIPPED: "bg-purple-100 text-purple-700",
                    DELIVERED: "bg-green-100 text-green-700",
                    CANCELLED: "bg-red-100 text-red-700",
                    PREORDER: "bg-indigo-100 text-indigo-700",
                    AWAITING_STOCK: "bg-orange-100 text-orange-700",
                  };
                  const itemCount = order.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-xs text-brand hover:text-brand"
                        >
                          #{order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">
                          {order.user.name ?? order.user.email}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{itemCount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            sColors[order.status] ?? "bg-gray-100 text-gray-700"
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
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
