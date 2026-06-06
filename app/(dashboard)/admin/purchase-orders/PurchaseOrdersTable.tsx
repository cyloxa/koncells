"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Loader2 } from "lucide-react";

export interface PurchaseOrderRow {
  id: string;
  poNumber: number;
  supplierName: string | null;
  status: string;
  totalCny: number;
  totalLkr: number;
  createdAt: Date;
  itemCount: number;
}

interface PurchaseOrdersTableProps {
  initialOrders: PurchaseOrderRow[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ORDERED: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  RECEIVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  ORDERED: "Ordered",
  SHIPPED: "Shipped",
  PARTIAL: "Partial",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export function PurchaseOrdersTable({ initialOrders }: PurchaseOrdersTableProps) {
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

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} purchase order(s)? This action cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { deletePurchaseOrders } = await import("@/actions/purchase-order.actions");
      const result = await deletePurchaseOrders(ids);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success(`${ids.length} purchase order(s) deleted`);
      setSelectedIds(new Set());
      setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete purchase orders");
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, router]);

  const fmtCny = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    });

  const fmtLkr = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  const formatDateTime = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 text-sm mt-1">
            {orders.length} purchase order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/purchase-orders/create"
          className="inline-flex items-center px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Purchase Order
        </Link>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4">
          <button
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isBulkDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Delete ({selectedIds.size})
          </button>
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
                <th className="text-left py-3 px-4 font-medium text-gray-600">Order Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total Amount</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total (LKR)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Total Items</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedIds.has(order.id) ? "bg-brand-light/20" : ""
                  }`}
                  onClick={() => router.push(`/admin/purchase-orders/${order.id}`)}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleOne(order.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm font-medium text-brand hover:text-brand/80">
                      PO-{String(order.poNumber).padStart(4, "0")}
                    </span>
                    {order.supplierName && (
                      <span className="ml-2 text-sm text-gray-500">
                        — {order.supplierName}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[order.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {fmtCny(order.totalCny)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {fmtLkr(order.totalLkr)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {order.itemCount}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No purchase orders yet. Create your first purchase order to get started.
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
