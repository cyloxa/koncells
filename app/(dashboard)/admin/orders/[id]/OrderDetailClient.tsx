"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Copy,
  MessageCircle,
  Package,
  Plus,
  Trash2,
  Search,
  X,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  updateOrderItem,
  updateOrderNotes,
  deleteOrderItems,
  addItemsToOrder,
  updateOrder,
} from "@/actions/order.actions";
import { searchProductsForOrder } from "@/actions/product.actions";

interface ProductSearchResult {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: any;
  buyingPrice: any;
  shippingCost: any;
  handlerCost: any;
  competitorsPrice: any;
  globalPrice: any;
  images: { url: string }[];
}

interface OrderItemData {
  id: string;
  quantity: number;
  price: number;
  costs: number | null;
  discount: number | null;
  profit: number | null;
  competitorsPrice: number | null;
  globalPrice: number | null;
  basePrice: number | null;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    model: string | null;
    stock: number;
    weight: number | null;
    images: { url: string }[];
    buyingPrice: number | null;
    shippingCost: number | null;
    handlerCost: number | null;
    competitorsPrice: number | null;
    globalPrice: number | null;
    price: number;
  };
}

interface OrderData {
  id: string;
  orderNumber: number;
  status: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  totalCosts: number | null;
  totalProfit: number | null;
  isManualOrder: boolean;
  notes: string | null;
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
  const [items, setItems] = useState<OrderItemData[]>(order.items);
  const [notes, setNotes] = useState(order.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Add products state
  const [showAddProducts, setShowAddProducts] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ProductSearchResult[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [addingItems, setAddingItems] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);

  // Exchange rate cache
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Hover popup state
  const [hoveredItem, setHoveredItem] = useState<OrderItemData | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  const fmtCurrency = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  // ─── Derived totals ─────────────────────────────────
  const orderTotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  // Total costs = sum of (basePrice + product.shippingCost + product.handlerCost) * quantity
  const computeItemTotalCosts = (item: OrderItemData) => {
    const basePrice = item.costs ?? 0;
    const shippingCost = Number(item.product.shippingCost ?? 0);
    const handlerCost = Number(item.product.handlerCost ?? 0);
    return (basePrice + shippingCost + handlerCost) * item.quantity;
  };

  const totalCosts = items.reduce((sum, i) => sum + computeItemTotalCosts(i), 0);
  const totalDiscount = items.reduce((sum, i) => sum + Number(i.discount ?? 0) * i.quantity, 0);
  const totalProfit = orderTotal - totalCosts - totalDiscount;
  const totalWeight = items.reduce(
    (sum, i) => sum + (Number(i.product.weight ?? 0) * i.quantity),
    0
  );

  // ─── Fetch exchange rate ────────────────────────────
  const getExchangeRate = useCallback(async () => {
    if (exchangeRate !== null) return exchangeRate;
    try {
      const res = await fetch("/api/exchange-rate?source=CNY&target=LKR");
      const data = await res.json();
      if (data.rate) {
        setExchangeRate(data.rate);
        return data.rate;
      }
    } catch {
      // silent
    }
    return null;
  }, [exchangeRate]);

  // Fetch exchange rate on mount
  useEffect(() => {
    getExchangeRate();
  }, [getExchangeRate]);

  // ─── Inline edit ────────────────────────────────────
  const handleInlineEdit = useCallback(
    async (
      itemId: string,
      field: "quantity" | "price" | "competitorsPrice" | "globalPrice" | "costs" | "discount",
      rawValue: string
    ) => {
      const value =
        field === "quantity"
          ? Math.max(1, parseInt(rawValue) || 1)
          : parseFloat(rawValue) || 0;

      // Optimistic update — when globalPrice changes, also update costs
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== itemId) return i;
          if (field === "globalPrice") {
            const rate = exchangeRate ?? 0;
            return {
              ...i,
              globalPrice: value,
              costs: value * (rate || 0),
            };
          }
          return { ...i, [field]: value };
        })
      );

      const payload: Record<string, unknown> = { orderId: order.id, itemId };
      if (field === "quantity") payload.quantity = value;
      else if (field === "competitorsPrice") payload.competitorsPrice = value || null;
      else if (field === "globalPrice") {
        payload.globalPrice = value || null;
        // Ensure exchange rate is cached
        if (exchangeRate === null) await getExchangeRate();
      } else payload[field] = value;

      const result = await updateOrderItem(payload as any);
      if (!result.success) {
        // Revert
        const originalItem = order.items.find((oi) => oi.id === itemId);
        if (originalItem) {
          setItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...originalItem } : i))
          );
        }
        toast.error(result.error || "Failed to update");
      }
    },
    [order.id, order.items, exchangeRate, getExchangeRate]
  );

  // ─── Product search for adding items ────────────────
  const searchProductsFn = useCallback(async (q: string) => {
    setProductLoading(true);
    try {
      const results = await searchProductsForOrder(q);
      setProducts(results as any);
      setShowProductDropdown(true);
    } catch {
      setProducts([]);
    } finally {
      setProductLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProductsFn(productQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [productQuery, searchProductsFn]);

  // Close add-products dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAddProductToOrder = async (product: ProductSearchResult) => {
    const defaultCost = Number(product.buyingPrice ?? 0);

    setAddingItems(true);
    try {
      const result = await addItemsToOrder({
        orderId: order.id,
        items: [
          {
            productId: product.id,
            quantity: 1,
            price: Number(product.price),
            costs: defaultCost,
            discount: 0,
          },
        ],
      });

      if (result.success) {
        toast.success("Product added");
        // Refresh — simplest approach since we need new item IDs
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to add product");
      }
    } catch {
      toast.error("Failed to add product");
    } finally {
      setAddingItems(false);
      setProductQuery("");
      setShowProductDropdown(false);
      setShowAddProducts(false);
    }
  };

  // ─── Bulk delete ────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("No items selected");
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteOrderItems(order.id, Array.from(selectedIds));
      if (result.success) {
        toast.success("Items removed");
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
      } else {
        toast.error(result.error || "Failed to delete items");
      }
    } catch {
      toast.error("Failed to delete items");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // ─── Save entire order ─────────────────────────
  const handleSaveOrder = async () => {
    if (items.length === 0) {
      toast.error("No items to save");
      return;
    }
    setSavingOrder(true);
    try {
      const result = await updateOrder({
        orderId: order.id,
        items: items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          price: Number(i.price),
          discount: Number(i.discount ?? 0),
        })),
      });
      if (result.success) {
        toast.success("Order saved");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to save order");
      }
    } catch {
      toast.error("Failed to save order");
    } finally {
      setSavingOrder(false);
    }
  };

  // ─── Notes save ─────────────────────────────────────
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const result = await updateOrderNotes({ orderId: order.id, notes });
      if (result.success) {
        toast.success("Notes saved");
      } else {
        toast.error(result.error || "Failed to save notes");
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  // ─── Copy to WhatsApp ───────────────────────────────
  const handleCopyToWhatsApp = async () => {
    setCopying(true);
    try {
      let text = "";
      items.forEach((item, idx) => {
        const lineTotal = Number(item.price) * item.quantity;
        const lineDiscount = Number(item.discount ?? 0) * item.quantity;
        const finalPrice = lineTotal - lineDiscount;
        const name = item.product.brand
          ? `${item.product.brand} ${item.product.name}`
          : item.product.name;
        if (lineDiscount > 0) {
          text += `${idx + 1}. ${name} × ${item.quantity}  →  ${
            fmtCurrency(lineTotal)
          } - Discount ${fmtCurrency(lineDiscount)}  =  ${fmtCurrency(finalPrice)}\n`;
        } else {
          text += `${idx + 1}. ${name} × ${item.quantity}  →  ${fmtCurrency(finalPrice)}\n`;
        }
      });
      text += `\nTotal Price: ${fmtCurrency(orderTotal)}`;
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    } finally {
      setCopying(false);
    }
  };

  // ─── Open WhatsApp ──────────────────────────────────
  const handleOpenWhatsApp = () => {
    if (!order.user.phone) {
      toast.error("Customer has no phone number");
      return;
    }
    const phone = order.user.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Order #${order.orderNumber}\nTotal: ${fmtCurrency(orderTotal)}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  // ─── Update Status ──────────────────────────────────
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

  // ─── Compute per-item values for table ──────────────
  const getItemValues = (item: OrderItemData) => {
    const qty = item.quantity;
    const sellingPrice = Number(item.price);
    const discount = item.discount ?? 0;

    // Base price = costs from the order item (globalPrice × current exchange rate)
    // When costs is missing, fall back to product's buyingPrice (CNY × rate at product creation time)
    const basePrice = item.costs ?? (
      exchangeRate != null && item.globalPrice != null
        ? Number(item.globalPrice) * exchangeRate
        : Number(item.product.buyingPrice ?? 0)
    );

    // Shipping and Handler per unit (from product)
    const shippingCost = Number(item.product.shippingCost ?? 0);
    const handlerCost = Number(item.product.handlerCost ?? 0);

    // Total costs (with qty) = (basePrice + shippingCost + handlerCost) * qty
    const totalItemCostPerUnit = basePrice + shippingCost + handlerCost;
    const totalCosts = totalItemCostPerUnit * qty;

    // Line total = (selling price × qty) - (discount × qty)
    const lineTotal = (sellingPrice - discount) * qty;

    // Profit = line total - total costs
    const lineProfit = lineTotal - totalCosts;

    return {
      competitorsPrice: item.competitorsPrice ?? item.product.competitorsPrice,
      globalPrice: item.globalPrice ?? item.product.globalPrice,
      basePrice,
      shippingCost,
      handlerCost,
      totalItemCostPerUnit,
      lineTotal,
      totalCosts,
      lineProfit,
    };
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
            className={`text-sm rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/40 ${
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

      <div className="space-y-6">
        {/* ─── Customer Details + Actions ──────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 mb-4">Customer Details</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {order.user.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                  <p className="text-sm text-gray-900">{order.user.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="text-sm text-gray-900">{order.user.email}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-start gap-2 pt-6">
              <Button
                onClick={handleCopyToWhatsApp}
                disabled={copying}
                className="bg-green-600 text-white hover:bg-green-700 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                {copying ? "Copying..." : "Copy to WhatsApp"}
              </Button>
              <Button
                onClick={handleOpenWhatsApp}
                className="bg-green-500 text-white hover:bg-green-600 text-xs"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Finance Summary above table ─────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-xs text-gray-500">Order Total</span>
              <p className="text-lg font-bold text-gray-900">{fmtCurrency(orderTotal)}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <span className="text-xs text-gray-500">Total Costs</span>
              <p className="text-lg font-bold text-gray-900">{fmtCurrency(totalCosts)}</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <span className="text-xs text-gray-500">Total Profit</span>
              <p
                className={`text-lg font-bold ${
                  totalProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {fmtCurrency(totalProfit)}
              </p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <span className="text-xs text-gray-500">Total Weight</span>
              <p className="text-lg font-bold text-gray-900">
                {totalWeight.toFixed(2)} kg
              </p>
            </div>
          </div>
        </div>

        {/* ─── Products Table ──────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                </Button>
              )}
            </div>
            <Button
              onClick={() => setShowAddProducts(true)}
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Products
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-center px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[60px]">
                    QTY
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[100px]">
                    Selling Price
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[100px]">
                    Competitor Price
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[100px]">
                    Supplier Price (CNY)
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[90px]">
                    Base Price
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[100px]">
                    Shipping (LKR)
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[100px]">
                    Handler (LKR)
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[90px]">
                    Total Costs
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[90px]">
                    Discount
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[80px]">
                    Profit
                  </th>
                  <th className="text-right px-3 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider min-w-[100px]">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const v = getItemValues(item);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/50 ${
                        selectedIds.has(item.id) ? "bg-brand/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />
                      </td>

                      {/* Name with hover popup */}
                      <td
                        className="px-4 py-3 relative"
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setPopupPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
                          setHoveredItem(item);
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[180px] cursor-pointer">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock: <span className={item.product.stock > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{item.product.stock}</span>
                          </p>
                        </div>
                      </td>

                      {/* QTY — inline editable */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleInlineEdit(item.id, "quantity", e.target.value)
                          }
                          className="w-14 text-center rounded-md border border-gray-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                      </td>

                      {/* Selling Price — inline editable */}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.price}
                          onChange={(e) =>
                            handleInlineEdit(item.id, "price", e.target.value)
                          }
                          className="w-24 text-right rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                      </td>

                      {/* Competitor Price */}
                      <td className="px-3 py-3 text-right text-gray-900">
                        {v.competitorsPrice != null
                          ? fmtCurrency(Number(v.competitorsPrice))
                          : "—"}
                      </td>

                      {/* Supplier Price (CNY) — inline editable, drives base price */}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.globalPrice ?? ""}
                          onChange={(e) =>
                            handleInlineEdit(item.id, "globalPrice", e.target.value)
                          }
                          className="w-24 text-right rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                          placeholder={`¥${item.product.buyingPrice != null && exchangeRate != null ? (Number(item.product.buyingPrice) / exchangeRate).toFixed(0) : "—"}`}
                        />
                      </td>

                      {/* Base Price */}
                      <td className="px-3 py-3 text-right text-gray-900">
                        {fmtCurrency(v.basePrice)}
                      </td>

                      {/* Shipping Cost (LKR) — from product × qty */}
                      <td className="px-3 py-3 text-right text-gray-900">
                        {fmtCurrency(v.shippingCost * item.quantity)}
                      </td>

                      {/* Handler Cost (LKR) — from product × qty */}
                      <td className="px-3 py-3 text-right text-gray-900">
                        {fmtCurrency(v.handlerCost * item.quantity)}
                      </td>

                      {/* Total Costs (base + shipping + handler) * qty */}
                      <td className="px-3 py-3 text-right text-gray-900">
                        {fmtCurrency(v.totalCosts)}
                      </td>

                      {/* Discount — inline editable */}
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.discount ?? 0}
                          onChange={(e) =>
                            handleInlineEdit(item.id, "discount", e.target.value)
                          }
                          className="w-20 text-right rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                      </td>

                      {/* Profit */}
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`font-medium ${
                            v.lineProfit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {fmtCurrency(v.lineProfit)}
                        </span>
                      </td>

                      {/* Line Total = (selling price - discount) × qty */}
                      <td className="px-3 py-3 text-right font-medium text-gray-900">
                        {fmtCurrency(v.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Name hover popup (fixed position, escapes overflow) ─── */}
        {hoveredItem && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              top: popupPos.top - 200,
              left: popupPos.left - 128,
            }}
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-4 w-64">
              <div className="h-40 rounded-lg overflow-hidden bg-gray-100 mb-3">
                {hoveredItem.product.images[0] ? (
                  <img
                    src={hoveredItem.product.images[0].url}
                    alt={hoveredItem.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="font-medium text-gray-900 text-sm mb-1">
                {hoveredItem.product.name}
              </p>
              {(hoveredItem.product.brand || hoveredItem.product.model) && (
                <p className="text-xs text-gray-500">
                  {hoveredItem.product.brand}
                  {hoveredItem.product.model ? ` / ${hoveredItem.product.model}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Add Products Modal ──────────────────────── */}
        {showAddProducts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Add Products</h2>
                <button
                  onClick={() => {
                    setShowAddProducts(false);
                    setShowProductDropdown(false);
                    setProductQuery("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div ref={productRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, brand, model or SKU..."
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    onFocus={() => {
                      if (products.length > 0) setShowProductDropdown(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                    autoFocus
                  />
                  {productLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {showProductDropdown && products.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAddProductToOrder(p)}
                        disabled={addingItems}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0 disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.images[0] ? (
                            <img
                              src={p.images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {p.name}
                          </p>
                          {p.brand && (
                            <p className="text-xs text-gray-500 truncate">
                              {p.brand}
                              {p.model ? ` / ${p.model}` : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          {fmtCurrency(Number(p.price))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {showProductDropdown &&
                  products.length === 0 &&
                  !productLoading &&
                  productQuery.trim() && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">No products match your search.</p>
                        <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Notes Section ───────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Order Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this order..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y"
          />
          <div className="flex justify-end mt-3">
            <Button
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </div>

        {/* ─── Save Order Button ───────────────────────── */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveOrder}
            disabled={savingOrder}
            size="lg"
          >
            <Save className="h-4 w-4" />
            {savingOrder ? "Saving Order..." : "Save Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
