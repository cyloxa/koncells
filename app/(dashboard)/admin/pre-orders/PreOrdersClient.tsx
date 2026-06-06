"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ShoppingCart, Loader2, CheckSquare } from "lucide-react";

interface PreOrderItem {
  id: string;
  quantity: number;
  createdAt: Date;
  orderItem: {
    id: string;
    quantity: number;
    price: number;
    costs: number | null;
    profit: number | null;
    discount: number | null;
    competitorsPrice: number | null;
    globalPrice: number | null;
    basePrice: number | null;
    orderId: string;
    productId: string;
    product: {
      id: string;
      name: string;
      slug: string;
      sku: string;
      images: { id: string; url: string; position: number }[];
    };
    order: {
      id: string;
      orderNumber: number;
      status: string;
      createdAt: Date;
      user: { id: string; name: string | null; email: string | null };
    };
  };
  purchaseOrderItem: {
    id: string;
    purchaseOrderId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPriceCny: number;
    lineTotalCny: number;
    lineTotalLkr: number;
    quantityReceived: number;
    purchaseOrder: {
      id: string;
      poNumber: number;
      supplierName: string | null;
      status: string;
    };
  };
}

interface PreOrdersClientProps {
  initialPreOrders: PreOrderItem[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
  PREORDER: "bg-indigo-100 text-indigo-700",
  AWAITING_STOCK: "bg-orange-100 text-orange-700",
};

export function PreOrdersClient({ initialPreOrders }: PreOrdersClientProps) {
  const router = useRouter();
  const [preOrders] = useState(initialPreOrders);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreatingPO, setIsCreatingPO] = useState(false);

  const allSelected =
    preOrders.length > 0 && preOrders.every((po) => selectedIds.has(po.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(preOrders.map((po) => po.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleCreatePurchaseOrder = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsCreatingPO(true);
    try {
      const { createPurchaseOrderFromPreOrders } = await import(
        "@/actions/pre-order.actions"
      );
      const result = await createPurchaseOrderFromPreOrders(Array.from(selectedIds));
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success(
        `Purchase order PO-${String(result.data.poNumber).padStart(4, "0")} created`
      );
      setSelectedIds(new Set());
      router.push("/admin/purchase-orders");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create purchase order"
      );
    } finally {
      setIsCreatingPO(false);
    }
  }, [selectedIds, router]);

  const fmtLkr = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pre-Orders</h1>
          <p className="text-gray-600 text-sm mt-1">
            {preOrders.length} pre-order item{preOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4">
          <button
            onClick={handleCreatePurchaseOrder}
            disabled={isCreatingPO}
            className="inline-flex items-center px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isCreatingPO ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4 mr-1.5" />
            )}
            Create Purchase Order ({selectedIds.size})
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
                <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Order</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Customer</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Qty</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Order Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">PO Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Received</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {preOrders.map((po) => (
                <tr
                  key={po.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(po.id) ? "bg-brand-light/20" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(po.id)}
                      onChange={() => toggleOne(po.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {po.orderItem.product.images[0] && (
                        <img
                          src={po.orderItem.product.images[0].url}
                          alt={po.orderItem.product.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {po.purchaseOrderItem.productName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {po.purchaseOrderItem.productSku}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/orders/${po.orderItem.order.id}`}
                      className="font-mono text-xs text-brand hover:text-brand/80"
                    >
                      #{po.orderItem.order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-900">
                    {po.orderItem.order.user.name ?? "Unknown"}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-900">
                    {po.quantity}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[po.orderItem.order.status] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {po.orderItem.order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {po.purchaseOrderItem.purchaseOrder ? (
                      <Link
                        href={`/admin/purchase-orders/${po.purchaseOrderItem.purchaseOrder.id}`}
                        className="text-xs text-brand hover:text-brand/80"
                      >
                        PO-{String(po.purchaseOrderItem.purchaseOrder.poNumber).padStart(4, "0")}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Not linked</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {po.purchaseOrderItem.purchaseOrder ? (
                      <span className="text-xs text-gray-600">
                        {po.purchaseOrderItem.quantityReceived}/{po.purchaseOrderItem.quantity}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                    {new Date(po.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {preOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No pre-orders yet. Pre-orders are created when an order contains products
                    that are out of stock.
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
