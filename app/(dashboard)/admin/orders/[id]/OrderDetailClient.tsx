"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, MessageCircle, Package, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface OrderItemData {
  id: string;
  quantity: number;
  price: any;
  costs: any;
  discount: any;
  profit: any;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    model: string | null;
    images: { url: string }[];
    buyingPrice: any;
    shippingCost: any;
    handlerCost: any;
  };
}

interface OrderData {
  id: string;
  orderNumber: number;
  status: string;
  subtotal: any;
  shippingCost: any;
  tax: any;
  total: any;
  totalCosts: any;
  totalProfit: any;
  isManualOrder: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  items: OrderItemData[];
}

interface Props {
  order: OrderData;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function OrderDetailClient({ order }: Props) {
  const [copying, setCopying] = useState(false);
  const [status, setStatus] = useState(order.status);

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(val);

  const orderTotal = order.items.reduce(
    (sum, i) => sum + Number(i.price) * i.quantity,
    0
  );
  const totalCosts = order.items.reduce(
    (sum, i) => sum + Number(i.costs ?? 0) * i.quantity,
    0
  );
  const totalDiscount = order.items.reduce(
    (sum, i) => sum + Number(i.discount ?? 0) * i.quantity,
    0
  );
  const totalProfit = orderTotal - totalCosts - totalDiscount;

  // ─── Copy to WhatsApp ─────────────────────────────────
  const handleCopyToWhatsApp = async () => {
    setCopying(true);
    try {
      let text = "";
      order.items.forEach((item, idx) => {
        const lineTotal = Number(item.price) * item.quantity;
        const lineDiscount = Number(item.discount ?? 0) * item.quantity;
        const finalPrice = lineTotal - lineDiscount;
        const name = item.product.brand
          ? `${item.product.brand} ${item.product.name}`
          : item.product.name;
        if (lineDiscount > 0) {
          text += `${idx + 1}. ${name} × ${item.quantity}  →  ${fmt(Number(item.price) * item.quantity)} - Discount ${fmt(lineDiscount)}  =  ${fmt(finalPrice)}\n`;
        } else {
          text += `${idx + 1}. ${name} × ${item.quantity}  →  ${fmt(finalPrice)}\n`;
        }
      });
      text += `\nTotal Price: ${fmt(orderTotal)}`;
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    } finally {
      setCopying(false);
    }
  };

  // ─── Open WhatsApp ────────────────────────────────────
  const handleOpenWhatsApp = () => {
    if (!order.user.phone) {
      toast.error("Customer has no phone number");
      return;
    }
    // Remove any non-digit characters from phone
    const phone = order.user.phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Order #${order.orderNumber}\nTotal: ${fmt(orderTotal)}`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  // ─── Update Status ────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        toast.success("Status updated");
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {order.isManualOrder && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                Manual Order
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`text-sm rounded-lg border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
              statusColors[status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {Object.keys(statusColors).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Products</h2>
            <div className="space-y-4">
              {order.items.map((item) => {
                const lineTotal = Number(item.price) * item.quantity;
                const lineDiscount = Number(item.discount ?? 0) * item.quantity;
                const finalPrice = lineTotal - lineDiscount;
                const itemCost = Number(item.costs ?? 0) * item.quantity;
                const itemProfit = finalPrice - itemCost;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.product.images[0] ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      {(item.product.brand || item.product.model) && (
                        <p className="text-xs text-gray-500">
                          {item.product.brand}
                          {item.product.model ? ` / ${item.product.model}` : ""}
                        </p>
                      )}
                      <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                        <div>
                          <span className="text-gray-500">Qty:</span>{" "}
                          <span className="font-medium">{item.quantity}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Price:</span>{" "}
                          <span className="font-medium">{fmt(Number(item.price))}</span>
                        </div>
                        {Number(item.discount ?? 0) > 0 && (
                          <div>
                            <span className="text-gray-500">Disc:</span>{" "}
                            <span className="font-medium text-red-600">
                              -{fmt(Number(item.discount) * item.quantity)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Total:</span>{" "}
                          <span className="font-medium">{fmt(finalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Customer Details</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-500">Name:</span>{" "}
                <span className="text-gray-900 font-medium">
                  {order.user.name ?? "—"}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Phone:</span>{" "}
                <span className="text-gray-900">{order.user.phone ?? "—"}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Email:</span>{" "}
                <span className="text-gray-900">{order.user.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right column — Summary + Actions */}
        <div className="space-y-6">
          {/* Finance section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Finance</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Order Total</span>
                <span className="font-medium text-gray-900">{fmt(orderTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Costs</span>
                <span className="font-medium text-gray-900">{fmt(totalCosts)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Discount</span>
                  <span className="font-medium text-red-600">-{fmt(totalDiscount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total Profit</span>
                  <span
                    className={`font-semibold ${
                      totalProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {fmt(totalProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 mb-2">Actions</h2>

            <button
              onClick={handleCopyToWhatsApp}
              disabled={copying}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Copy className="h-4 w-4" />
              {copying ? "Copying..." : "Copy to WhatsApp"}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
