"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreOrderItemInfo {
  id: string;
  quantity: number;
  orderItem: {
    id: string;
    price: number;
    costs: number | null;
    profit: number | null;
    discount: number | null;
    competitorsPrice: number | null;
    globalPrice: number | null;
    basePrice: number | null;
    product: { id: string; name: string; slug: string };
    order: { id: string; orderNumber: number; status: string; createdAt: Date };
  };
  purchaseOrderItem: {
    unitPriceCny: number;
    lineTotalCny: number;
    lineTotalLkr: number;
  };
}

interface POItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  quantityReceived: number;
  unitPriceCny: number;
  lineTotalCny: number;
  lineTotalLkr: number;
  status: string;
  product: {
    id: string;
    name: string;
    slug: string;
    weight: number | null;
    images: { id: string; url: string; position: number }[];
  } | null;
  preOrderItems: PreOrderItemInfo[];
}

interface Shipment {
  id: string;
  shipmentNumber: number;
  status: string;
  totalWeight: number | null;
  shippingRatePerKg: number | null;
  extraCost: number | null;
  totalShippingCost: number | null;
  notes: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

interface PurchaseOrder {
  id: string;
  poNumber: number;
  supplierName: string | null;
  totalCny: number;
  exchangeRate: number;
  totalLkr: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: POItem[];
  shipments: Shipment[];
}

interface PurchaseOrderDetailClientProps {
  purchaseOrder: PurchaseOrder;
}

const itemStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PURCHASED: "bg-blue-100 text-blue-800",
  IN_WAREHOUSE: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RETURNED: "bg-gray-100 text-gray-800",
};

const shipmentStatusColors: Record<string, string> = {
  PENDING_PACKING: "bg-yellow-100 text-yellow-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const itemStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  PURCHASED: "Purchased",
  IN_WAREHOUSE: "In warehouse",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

interface EditableItem {
  id: string;
  quantity: number;
  unitPriceCny: number;
  status: string;
}

interface NewItem {
  productId: string;
  quantity: number;
  unitPriceCny: number;
}

export function PurchaseOrderDetailClient({
  purchaseOrder: initialPO,
}: PurchaseOrderDetailClientProps) {
  const router = useRouter();
  const [po, setPo] = useState(initialPO);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [poNotes, setPoNotes] = useState(po.notes ?? "");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Edit state for items
  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    po.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPriceCny: item.unitPriceCny,
      status: item.status,
    }))
  );

  // Add items state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItems, setNewItems] = useState<NewItem[]>([
    { productId: "", quantity: 1, unitPriceCny: 0 },
  ]);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string; price: number }[]
  >([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const allSelected =
    po.items.length > 0 && po.items.every((item) => selectedItemIds.has(item.id));

  // ─── PO Notes ──────────────────────────────────────

  const handleSaveNotes = useCallback(async () => {
    setIsSavingNotes(true);
    try {
      const { updatePurchaseOrderNotes } = await import(
        "@/actions/purchase-order.actions"
      );
      const result = await updatePurchaseOrderNotes(po.id, poNotes || null);
      if (!result.success) throw new Error(result.error);
      toast.success("Notes updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notes");
    } finally {
      setIsSavingNotes(false);
    }
  }, [po.id, poNotes, router]);

  // ─── Item selection ────────────────────────────────

  const toggleItemSelection = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const toggleAllItems = () => {
    if (allSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(po.items.map((item) => item.id)));
    }
  };

  // ─── Bulk delete items ─────────────────────────────

  const handleBulkDelete = useCallback(async () => {
    if (selectedItemIds.size === 0) return;
    if (!confirm(`Delete ${selectedItemIds.size} item(s)? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    try {
      const { bulkDeletePurchaseOrderItems } = await import(
        "@/actions/purchase-order.actions"
      );
      const result = await bulkDeletePurchaseOrderItems(Array.from(selectedItemIds));
      if (!result.success) throw new Error(result.error);
      toast.success(`${selectedItemIds.size} item(s) deleted`);
      setPo((prev) => ({
        ...prev,
        items: prev.items.filter((item) => !selectedItemIds.has(item.id)),
      }));
      setEditableItems((prev) =>
        prev.filter((item) => !selectedItemIds.has(item.id))
      );
      setSelectedItemIds(new Set());
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete items");
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedItemIds, router]);

  const updateEditableField = (
    id: string,
    field: keyof EditableItem,
    value: string | number
  ) => {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const saveItem = useCallback(
    async (itemId: string) => {
      const item = editableItems.find((i) => i.id === itemId);
      if (!item) return;
      const original = po.items.find((i) => i.id === itemId);
      if (!original) return;

      if (
        original.quantity === item.quantity &&
        original.unitPriceCny === item.unitPriceCny
      ) {
        return;
      }

      try {
        const { updatePurchaseOrderItem } = await import(
          "@/actions/purchase-order.actions"
        );
        const result = await updatePurchaseOrderItem(itemId, item.quantity, item.unitPriceCny);
        if (!result.success) throw new Error(result.error);
        toast.success("Item updated");
        setPo((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantity: item.quantity,
                  unitPriceCny: item.unitPriceCny,
                  lineTotalCny: item.unitPriceCny * item.quantity,
                  lineTotalLkr: item.unitPriceCny * item.quantity * po.exchangeRate,
                }
              : i
          ),
        }));
        router.refresh();
      } catch (err) {
        setEditableItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantity: original.quantity,
                  unitPriceCny: original.unitPriceCny,
                }
              : i
          )
        );
        toast.error(err instanceof Error ? err.message : "Failed to update item");
      }
    },
    [editableItems, po.exchangeRate, po.items, router]
  );

  // ─── Item status change ────────────────────────────

  const handleItemStatusChange = useCallback(
    async (itemId: string, status: string) => {
      try {
        const { updatePurchaseOrderItemStatus } = await import(
          "@/actions/purchase-order.actions"
        );
        const result = await updatePurchaseOrderItemStatus(
          itemId,
          status as "PENDING" | "PURCHASED" | "IN_WAREHOUSE" | "CANCELLED" | "RETURNED"
        );
        if (!result.success) throw new Error(result.error);
        toast.success(`Status updated to ${itemStatusLabels[status] ?? status}`);
        setEditableItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status } : item))
        );
        setPo((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, status } : item
          ),
        }));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update item status"
        );
      }
    },
    []
  );

  // ─── Add items ─────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch("/api/products?limit=1000");
      const data = await res.json();
      setProducts(
        (data.products ?? data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price),
        }))
      );
    } catch {
      toast.error("Failed to load products");
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const openAddForm = () => {
    setShowAddForm(true);
    loadProducts();
  };

  const addNewItemRow = () => {
    setNewItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, unitPriceCny: 0 },
    ]);
  };

  const updateNewItem = (
    index: number,
    field: keyof NewItem,
    value: string | number
  ) => {
    setNewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeNewItemRow = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItems = useCallback(async () => {
    const validItems = newItems.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    setIsAddingItems(true);
    try {
      const { addItemsToPurchaseOrder } = await import(
        "@/actions/purchase-order.actions"
      );
      const result = await addItemsToPurchaseOrder({
        purchaseOrderId: po.id,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCny: item.unitPriceCny,
        })),
      });
      if (!result.success) throw new Error(result.error);
      toast.success("Items added to purchase order");
      setShowAddForm(false);
      setNewItems([{ productId: "", quantity: 1, unitPriceCny: 0 }]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add items");
    } finally {
      setIsAddingItems(false);
    }
  }, [newItems, po.id, router]);

  // ─── Formatting ────────────────────────────────────

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

  const fmtPlain = (n: number, digits = 2) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/purchase-orders"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Purchase Orders
        </Link>
        <div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              PO-{String(po.poNumber).padStart(4, "0")}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Created on{" "}
              {new Date(po.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Supplier & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Supplier</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">
                {po.supplierName ?? "N/A"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Summary</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Items</dt>
              <dd className="text-sm font-medium text-gray-900">{po.items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Exchange Rate</dt>
              <dd className="text-sm font-medium text-gray-900">
                1 CNY = {po.exchangeRate.toFixed(4)} LKR
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total (CNY)</dt>
              <dd className="text-sm font-medium text-gray-900">{fmtCny(po.totalCny)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Total (LKR)</dt>
              <dd className="text-sm font-medium text-gray-900">{fmtLkr(po.totalLkr)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Shipments</h2>
          {po.shipments.length === 0 ? (
            <p className="text-sm text-gray-500">No shipments created yet.</p>
          ) : (
            <div className="space-y-2">
              {po.shipments.slice(0, 3).map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/shipments/${s.id}`}
                  className="block text-sm text-brand hover:text-brand/80"
                >
                  Shipment #{s.shipmentNumber}
                </Link>
              ))}
              {po.shipments.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{po.shipments.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editable PO Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
          >
            {isSavingNotes ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            Save
          </Button>
        </div>
        <textarea
          value={poNotes}
          onChange={(e) => setPoNotes(e.target.value)}
          placeholder="Add notes to this purchase order..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
        />
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
          <div className="flex items-center gap-2">
            {selectedItemIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isBulkDeleting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Delete ({selectedItemIds.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={openAddForm}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Items
            </Button>
          </div>
        </div>

        {/* Add Items Form */}
        {showAddForm && (
          <div className="border-b border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Add New Items</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewItems([{ productId: "", quantity: 1, unitPriceCny: 0 }]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 mb-3">
              {newItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <select
                      value={item.productId}
                      onChange={(e) => updateNewItem(index, "productId", e.target.value)}
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateNewItem(index, "quantity", parseInt(e.target.value) || 1)
                      }
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand"
                      placeholder="Qty"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPriceCny}
                      onChange={(e) =>
                        updateNewItem(
                          index,
                          "unitPriceCny",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand"
                      placeholder="Price CNY"
                    />
                  </div>
                  <button
                    onClick={() => removeNewItemRow(index)}
                    className="mt-2 text-gray-400 hover:text-red-500"
                    disabled={newItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addNewItemRow}>
                <Plus className="h-3 w-3 mr-1" />
                Add Row
              </Button>
              <Button
                size="sm"
                onClick={handleAddItems}
                disabled={isAddingItems}
              >
                {isAddingItems && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Add to Order
              </Button>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAllItems}
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Product</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Qty</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Received</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Unit Price (CNY)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Line Total (CNY)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Line Total (LKR)</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => {
                const edit = editableItems.find((e) => e.id === item.id);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      selectedItemIds.has(item.id) ? "bg-brand-light/20" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.product?.images?.[0] ? (
                            <img
                              src={item.product.images[0].url}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              —
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {item.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        min={1}
                        value={edit?.quantity ?? item.quantity}
                        onChange={(e) =>
                          updateEditableField(
                            item.id,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                        onBlur={() => saveItem(item.id)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${item.quantityReceived >= item.quantity ? "text-green-600" : item.quantityReceived > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {item.quantityReceived}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={edit?.unitPriceCny ?? item.unitPriceCny}
                        onChange={(e) =>
                          updateEditableField(
                            item.id,
                            "unitPriceCny",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        onBlur={() => saveItem(item.id)}
                        className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {fmtPlain(item.lineTotalCny)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {fmtPlain(item.lineTotalLkr, 0)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={edit?.status ?? item.status}
                        onChange={(e) => {
                          handleItemStatusChange(item.id, e.target.value);
                        }}
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border-0 ${
                          itemStatusColors[edit?.status ?? item.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {Object.entries(itemStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {po.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No items in this purchase order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipments Listing */}
      {po.shipments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {po.shipments.map((shipment) => (
              <div key={shipment.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/admin/shipments/${shipment.id}`}
                    className="font-medium text-brand hover:text-brand/80"
                  >
                    Shipment #{shipment.shipmentNumber}
                  </Link>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      shipmentStatusColors[shipment.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {shipment.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
