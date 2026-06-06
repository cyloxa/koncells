"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OrderRow {
  id: string;
  orderNumber: number;
  orderName: string;
  createdAt: Date;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  total: number;
  totalCosts: number | null;
  totalProfit: number | null;
  itemCount: number;
}

interface AdminOrdersTableProps {
  initialOrders: OrderRow[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  PREORDER: "bg-indigo-100 text-indigo-700",
  AWAITING_STOCK: "bg-orange-100 text-orange-700",
};

export default function AdminOrdersTable({ initialOrders }: AdminOrdersTableProps) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} order(s)? This action cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch(`/api/admin/orders?ids=${ids.join(",")}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete orders");
      }
      toast.success(`${ids.length} order(s) deleted`);
      setSelectedIds(new Set());
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete orders");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const fmtCurrency = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 text-sm mt-1">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/orders/create"
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
        >
          + Create Order
        </Link>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {isBulkDeleting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete ({selectedIds.size})
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Order</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Items</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total Cost</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total Profit</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(order.id) ? "bg-brand-light/20" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleOne(order.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs text-brand hover:text-brand/80"
                    >
                      {order.orderName}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">
                      {order.customerName ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500">{order.customerEmail}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
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
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {fmtCurrency(order.totalCosts ?? 0)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-medium ${
                        (order.totalProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {fmtCurrency(order.totalProfit ?? 0)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {fmtCurrency(order.total)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No orders yet. Create your first order to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
