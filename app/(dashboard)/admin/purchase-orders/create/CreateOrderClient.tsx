"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface SupplierOption {
  id: string;
  name: string;
  contact: string | null;
}

interface LineItem {
  productId: string;
  quantity: number;
  unitPriceCny: number;
  notes: string;
}

interface CreateOrderClientProps {
  products: ProductOption[];
  suppliers: SupplierOption[];
  defaultExchangeRate: number | null;
}

export function CreateOrderClient({
  products,
  suppliers,
  defaultExchangeRate,
}: CreateOrderClientProps) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: 1, unitPriceCny: 0, notes: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    if (id) {
      const sup = suppliers.find((s) => s.id === id);
      if (sup) {
        setSupplierName(sup.name);
        setSupplierContact(sup.contact ?? "");
      }
    } else {
      setSupplierName("");
      setSupplierContact("");
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", quantity: 1, unitPriceCny: 0, notes: "" }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateItem(index, "productId", productId);
    if (product && items[index].unitPriceCny === 0) {
      // Suggest a default price based on the product price (rough conversion)
      const suggestedCny = defaultExchangeRate ? Math.round(product.price / defaultExchangeRate) : 0;
      updateItem(index, "unitPriceCny", suggestedCny);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (items.length === 0 || items.some((i) => !i.productId)) {
        toast.error("Please add at least one product to the order");
        return;
      }
      if (!supplierName.trim()) {
        toast.error("Supplier name is required");
        return;
      }

      setIsSubmitting(true);
      try {
        const { createPurchaseOrder } = await import("@/actions/purchase-order.actions");
        const result = await createPurchaseOrder({
          supplierName: supplierName.trim(),
          supplierContact: supplierContact.trim() || null,
          supplierId: supplierId || null,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPriceCny: i.unitPriceCny,
            notes: i.notes || null,
          })),
          notes: notes.trim() || null,
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        toast.success(`Purchase order PO-${String(result.data.poNumber).padStart(4, "0")} created`);
        router.push("/admin/purchase-orders");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create purchase order");
      } finally {
        setIsSubmitting(false);
      }
    },
    [items, supplierName, supplierContact, supplierId, notes, router]
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/purchase-orders"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Purchase Orders
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <p className="text-gray-600 text-sm mt-1">Create a purchase order to restock inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Supplier Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
              >
                <option value="">Enter manually or select...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Supplier name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <input
                type="text"
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder="Phone or email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* Order Items Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-brand border border-brand rounded-lg hover:bg-brand-light/20 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No items added yet. Click &quot;Add Item&quot; to add products.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                    >
                      <option value="">Select a product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Unit Price (CNY)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPriceCny}
                      onChange={(e) =>
                        updateItem(index, "unitPriceCny", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="mt-6 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes or instructions..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/purchase-orders"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="inline-flex items-center px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Create Purchase Order
          </button>
        </div>
      </form>
    </div>
  );
}
