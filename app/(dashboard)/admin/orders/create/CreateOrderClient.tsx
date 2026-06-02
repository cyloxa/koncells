"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, ChevronRight, X, UserPlus, Package } from "lucide-react";
import { searchCustomers, createCustomer } from "@/actions/customer.actions";
import { searchProductsForOrder } from "@/actions/product.actions";
import { createManualOrder } from "@/actions/order.actions";
import toast from "react-hot-toast";

interface CustomerResult {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
}

interface ProductResult {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: any;
  buyingPrice: any;
  shippingCost: any;
  handlerCost: any;
  images: { url: string }[];
}

interface OrderItem {
  productId: string;
  productName: string;
  productBrand: string | null;
  productModel: string | null;
  quantity: number;
  price: number;
  costs: number;
  discount: number;
  imageUrl: string | null;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<"customer" | "products" | "review">("customer");

  // Customer selection
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // New customer creation
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });
  const [creating, setCreating] = useState(false);

  // Product search
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);

  // Order items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // ─── Customer search ──────────────────────────────────
  const searchCustomersDebounced = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCustomers([]);
      return;
    }
    try {
      const results = await searchCustomers(q);
      setCustomers(results as any);
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerQuery) searchCustomersDebounced(customerQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery, searchCustomersDebounced]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectCustomer = (customer: CustomerResult) => {
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setCustomerQuery(customer.name ?? customer.email);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email) {
      toast.error("Name and email are required");
      return;
    }
    setCreating(true);
    try {
      const result = await createCustomer({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone || null,
        location: newCustomer.location || null,
        socialLinks: null,
        additionalNotes: null,
        password: null,
      });
      if (result.success) {
        toast.success("Customer created");
        setSelectedCustomer({
          id: result.data.id,
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone || null,
          location: newCustomer.location || null,
        });
        setShowNewCustomer(false);
        setNewCustomer({ name: "", email: "", phone: "", location: "" });
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setCreating(false);
    }
  };

  // ─── Product search ───────────────────────────────────
  const searchProductsDebounced = useCallback(async (q: string) => {
    try {
      const results = await searchProductsForOrder(q);
      setProducts(results as any);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProductsDebounced(productQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [productQuery, searchProductsDebounced]);

  const handleAddProduct = (product: ProductResult) => {
    const defaultCost = Number(product.buyingPrice ?? 0) + Number(product.shippingCost ?? 0) + Number(product.handlerCost ?? 0);
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productModel: product.model,
          quantity: 1,
          price: Number(product.price),
          costs: defaultCost,
          discount: 0,
          imageUrl: product.images[0]?.url ?? null,
        },
      ];
    });
    setProductQuery("");
    setShowProductDropdown(false);
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleUpdateItem = (
    productId: string,
    field: keyof Pick<OrderItem, "price" | "costs" | "discount" | "quantity">,
    value: number
  ) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, [field]: value } : i))
    );
  };

  // ─── Calculations ─────────────────────────────────────
  const orderTotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCosts = orderItems.reduce((sum, i) => sum + i.costs * i.quantity, 0);
  const totalDiscount = orderItems.reduce((sum, i) => sum + i.discount * i.quantity, 0);
  const totalProfit = orderTotal - totalCosts - totalDiscount;

  // ─── Submit ───────────────────────────────────────────
  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (orderItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createManualOrder({
        customerId: selectedCustomer.id,
        items: orderItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productBrand: i.productBrand,
          productModel: i.productModel,
          quantity: i.quantity,
          price: i.price,
          costs: i.costs,
          discount: i.discount,
        })),
      });
      if (result.success) {
        toast.success("Order created!");
        router.push(`/admin/orders/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Order</h1>
        <p className="text-gray-600 text-sm mt-1">
          Step {step === "customer" ? "1" : step === "products" ? "2" : "3"} of 3
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { id: "customer" as const, label: "Customer" },
          { id: "products" as const, label: "Products" },
          { id: "review" as const, label: "Review" },
        ].map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s.id === "customer") setStep("customer");
                else if (s.id === "products" && selectedCustomer) setStep("products");
                else if (s.id === "review" && selectedCustomer && orderItems.length > 0)
                  setStep("review");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === s.id
                  ? "bg-brand text-white"
                  : (s.id === "customer" ||
                      (s.id === "products" && selectedCustomer) ||
                      (s.id === "review" && selectedCustomer && orderItems.length > 0))
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-50 text-gray-400 cursor-not-allowed"
              }`}
              disabled={
                !(
                  s.id === "customer" ||
                  (s.id === "products" && selectedCustomer) ||
                  (s.id === "review" && selectedCustomer && orderItems.length > 0)
                )
              }
            >
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              {s.label}
            </button>
            {idx < 2 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          </div>
        ))}
      </div>

      {/* ─── Step 1: Customer ─────────────────────────────── */}
      {step === "customer" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Customer</h2>

          {selectedCustomer && !showNewCustomer ? (
            <div className="mb-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerQuery("");
                  }}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  Change
                </button>
              </div>
            </div>
          ) : null}

          {!selectedCustomer || showNewCustomer ? (
            <>
              <div ref={customerRef} className="relative mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers by name, email or phone..."
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => {
                      if (customerQuery.trim()) setShowCustomerDropdown(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  />
                </div>

                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-medium">
                          {(c.name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand/80 font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  Create new customer
                </button>
              </div>

              {showNewCustomer && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">New Customer</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Name *"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={newCustomer.location}
                      onChange={(e) =>
                        setNewCustomer((prev) => ({ ...prev, location: e.target.value }))
                      }
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowNewCustomer(false);
                        setNewCustomer({ name: "", email: "", phone: "", location: "" });
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCustomer}
                      disabled={creating}
                      className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create & Select"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep("products")}
              disabled={!selectedCustomer}
              className="px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Next — Add Products
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Products ─────────────────────────────── */}
      {step === "products" && (
        <div className="space-y-4">
          {/* Product search */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Products</h2>
            <div ref={productRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, brand, model or SKU..."
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
              </div>

              {showProductDropdown && products.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {p.images[0] ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        {p.brand && (
                          <p className="text-xs text-gray-500 truncate">
                            {p.brand}{p.model ? ` / ${p.model}` : ""}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        {fmt(Number(p.price))}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order items list */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Items ({orderItems.length})
            </h2>

            {orderItems.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No products added yet. Search and add products above.
              </p>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  const lineCosts = item.costs * item.quantity;
                  const lineDiscount = item.discount * item.quantity;
                  const lineProfit = lineTotal - lineCosts - lineDiscount;
                  return (
                    <div
                      key={item.productId}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                        {item.productBrand && (
                          <p className="text-xs text-gray-500">
                            {item.productBrand}{item.productModel ? ` / ${item.productModel}` : ""}
                          </p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Qty</label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.productId,
                                  "quantity",
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Selling Price
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.price}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.productId,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Cost</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.costs}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.productId,
                                  "costs",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Discount</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.discount}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.productId,
                                  "discount",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-4 text-xs text-gray-600">
                            <span>Line total: <strong>{fmt(lineTotal)}</strong></span>
                            <span>Profit: <strong className={lineProfit >= 0 ? "text-green-600" : "text-red-600"}>{fmt(lineProfit)}</strong></span>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("customer")}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Customer
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={orderItems.length === 0}
              className="px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Next — Review
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Review ───────────────────────────────── */}
      {step === "review" && (
        <div className="space-y-4">
          {/* Customer summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Customer</h2>
            <p className="text-gray-900 font-medium">{selectedCustomer?.name}</p>
            <p className="text-sm text-gray-500">
              {selectedCustomer?.email}
              {selectedCustomer?.phone ? ` · ${selectedCustomer.phone}` : ""}
            </p>
          </div>

          {/* Order items review */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Products</h2>
            <div className="space-y-3">
              {orderItems.map((item) => {
                const lineTotal = item.price * item.quantity;
                const lineDiscount = item.discount * item.quantity;
                const finalPrice = lineTotal - lineDiscount;
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        {item.productBrand}{item.productModel ? ` / ${item.productModel}` : ""} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-gray-900">
                        {item.price > item.discount ? fmt(finalPrice) : fmt(lineTotal)}
                      </p>
                      {item.discount > 0 && (
                        <p className="text-xs text-green-600">-{fmt(lineDiscount)} discount</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finance summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Order Total</span>
                <span className="font-medium text-gray-900">{fmt(orderTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Costs</span>
                <span className="font-medium text-gray-900">{fmt(totalCosts)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Discount</span>
                <span className="font-medium text-red-600">-{fmt(totalDiscount)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-900">Total Profit</span>
                <span
                  className={`font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {fmt(totalProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("products")}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Products
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={submitting}
              className="px-8 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Creating Order..." : "Create Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
