"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  X,
  Loader2,
  Check,
  Download,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { exportProductsCsv, importProductsCsv } from "@/actions/product.actions";

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  model: string | null;
  description: string;
  metaDescription: string | null;
  images: { url: string; alt: string | null }[];
  price: number;
  compareAtPrice: number | null;
  globalPrice: number | null;
  buyingPrice: number | null;
  competitorsPrice: number | null;
  shippingCost: number | null;
  handlerCost: number | null;
  stock: number;
  isActive: boolean;
  categoryName: string | null;
}

interface AdminProductsTableProps {
  initialProducts: ProductRow[];
  usdToLkr: number | null;
  cnyToLkr: number | null;
}

export default function AdminProductsTable({ initialProducts, usdToLkr, cnyToLkr }: AdminProductsTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [lightboxProduct, setLightboxProduct] = useState<{ name: string; images: { url: string; alt: string | null }[] } | null>(null);

  // Import/Export state
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [downloadImages, setDownloadImages] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? products.filter(
        (p) => {
          const q = search.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
            (p.model && p.model.toLowerCase().includes(q)) ||
            p.description.toLowerCase().includes(q) ||
            (p.metaDescription && p.metaDescription.toLowerCase().includes(q))
          );
        }
      )
    : products;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
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
    if (!confirm(`Delete ${selectedIds.size} product(s)?`)) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch(`/api/admin/products?ids=${ids.join(",")}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete products");
      }
      toast.success(`${ids.length} product(s) deleted`);
      setSelectedIds(new Set());
      setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete products");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ─── Inline edit ─────────────────────────────────────
  const startEdit = (id: string, field: string, currentValue: number | null) => {
    setEditingCell({ id, field });
    setEditValue(currentValue !== null ? currentValue.toString() : "");
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;

    // Convert CNY back to LKR for buyingPrice field, and USD back to LKR for globalPrice
    let saveValue = editValue;
    if (field === "globalPrice" && editValue && usdToLkr) {
      saveValue = (Number(editValue) * usdToLkr).toFixed(0);
    }
    if (field === "buyingPrice" && editValue && cnyToLkr) {
      saveValue = (Number(editValue) * cnyToLkr).toFixed(0);
    }

    const numVal = saveValue === "" ? null : Number(saveValue);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: numVal } : p))
    );
    setEditingCell(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, field, value: saveValue }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      toast.error("Failed to update field");
      router.refresh();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditingCell(null);
  };

  // ─── Copy image to clipboard ─────────────────────────
  const handleCopy = useCallback(async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCopyingId(productId);
    try {
      const price = product.price.toLocaleString("en-US", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      const brandModel = [product.brand, product.model].filter(Boolean).join(" - ");

      // Build text with bold markers (WhatsApp/Facebook use simple text)
      const text = `*${product.name}*\n${brandModel ? `_${brandModel}_\n` : ""}*${price}*\n─────────────────`;

      await navigator.clipboard.writeText(text);
      toast.success("Product details copied!");
    } catch {
      toast.error("Failed to copy");
    } finally {
      setCopyingId(null);
    }
  }, [products]);

  // ─── CSV Export ─────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportProductsCsv();
      if (result.success) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `products-export-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Products exported");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to export products");
    } finally {
      setIsExporting(false);
    }
  };

  // ─── CSV Import ─────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = await importProductsCsv(text, downloadImages);
      if (result.success) {
        setImportResult(result.data);
        if (result.data.created > 0 || result.data.updated > 0) {
          const total = result.data.created + result.data.updated;
          toast.success(`Imported ${total} product(s) (${result.data.created} new, ${result.data.updated} updated)`);
          router.refresh();
        }
        if (result.data.skipped > 0) {
          toast.error(`${result.data.skipped} product(s) skipped`);
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to read CSV file");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const profit = (p: ProductRow) => {
    const selling = p.price || 0;
    const cost = p.buyingPrice ? Number(p.buyingPrice) : 0;
    const shipping = p.shippingCost ? Number(p.shippingCost) : 0;
    const handler = p.handlerCost ? Number(p.handlerCost) : 0;
    return selling - cost - shipping - handler;
  };

  const totalCosts = (p: ProductRow) => {
    const shipping = p.shippingCost ? Number(p.shippingCost) : 0;
    const handler = p.handlerCost ? Number(p.handlerCost) : 0;
    return shipping + handler;
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fmtCurrency = (n: number | null) => {
    if (n === null || n === undefined) return "—";
    return `Rs. ${fmt(n)}`;
  };

  return (
    <>
      <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 text-sm mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, model, brand, description..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
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
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </th>
                <th className="text-left py-3 px-3 font-medium text-gray-600">Product</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Selling Price</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Buying (LKR)</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Global (LKR)</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Competitor</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Stock</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Profit</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Costs</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const p = profit(product);
                const tc = totalCosts(product);
                const isPriceEdit = editingCell?.id === product.id && editingCell?.field === "price";
                const isCnyEdit = editingCell?.id === product.id && editingCell?.field === "buyingPrice";
                const isGlobalEdit = editingCell?.id === product.id && editingCell?.field === "globalPrice";
                const isCompEdit = editingCell?.id === product.id && editingCell?.field === "competitorsPrice";

                return (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedIds.has(product.id) ? "bg-brand-light/20" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxProduct({
                            name: product.name,
                            images: product.images,
                          })
                        }
                        className="flex items-center gap-3 text-left"
                      >
                        {product.images[0] ? (
                          <img
                            src={product.images[0].url}
                            alt={product.images[0].alt || product.name}
                            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-200 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {[product.brand, product.model].filter(Boolean).join(" - ") || product.sku}
                          </p>
                        </div>
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right w-[130px]">
                      <EditableCell
                        isEditing={isPriceEdit}
                        value={editValue}
                        displayValue={`Rs. ${fmt(product.price)}`}
                        onStart={() => startEdit(product.id, "price", product.price)}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onKeyDown={handleEditKeyDown}
                      />
                    </td>

                    <td className="py-3 px-3 text-right w-[130px]">
                      <EditableCell
                        isEditing={isCnyEdit}
                        value={editValue}
                        displayValue={fmtCurrency(product.buyingPrice)}
                        onStart={() => {
                          const cnyValue = product.buyingPrice !== null && cnyToLkr
                            ? (product.buyingPrice / cnyToLkr).toFixed(2)
                            : "";
                          startEdit(product.id, "buyingPrice", product.buyingPrice);
                          setEditValue(cnyValue);
                        }}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onKeyDown={handleEditKeyDown}
                        editPrefix="CNY"
                      />
                    </td>

                    <td className="py-3 px-3 text-right w-[150px]">
                      <EditableCell
                        isEditing={isGlobalEdit}
                        value={editValue}
                        displayValue={fmtCurrency(product.globalPrice)}
                        onStart={() => {
                          const usdValue = product.globalPrice !== null && usdToLkr
                            ? (product.globalPrice / usdToLkr).toFixed(2)
                            : "";
                          startEdit(product.id, "globalPrice", product.globalPrice);
                          setEditValue(usdValue);
                        }}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onKeyDown={handleEditKeyDown}
                        editPrefix="USD"
                      />
                    </td>

                    <td className="py-3 px-3 text-right w-[130px]">
                      <EditableCell
                        isEditing={isCompEdit}
                        value={editValue}
                        displayValue={fmtCurrency(product.competitorsPrice)}
                        onStart={() => startEdit(product.id, "competitorsPrice", product.competitorsPrice)}
                        onChange={setEditValue}
                        onSave={saveEdit}
                        onKeyDown={handleEditKeyDown}
                      />
                    </td>

                    <td className="py-3 px-3 text-right w-[80px]">
                      <span className={`font-medium ${product.stock <= 0 ? "text-red-600" : product.stock <= 5 ? "text-amber-600" : "text-gray-900"}`}>
                        {product.stock}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right w-[130px]">
                      <span className={`font-medium ${p >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmtCurrency(p)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right w-[130px] text-gray-600">
                      {fmtCurrency(tc)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(product.id)}
                          disabled={copyingId === product.id}
                          className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light/30 rounded-lg transition-colors"
                          title="Copy product card to clipboard"
                        >
                          {copyingId === product.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light/30 rounded-lg transition-colors"
                          title="Edit product"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    {search ? "No products match your search." : "No products yet. Create your first product to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* ─── Import CSV Modal ───────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Import Products from CSV</h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-800">CSV format:</p>
                <code className="block text-xs font-mono bg-white p-2 rounded border border-gray-200 whitespace-pre-wrap break-all">
                  name,slug,sku,categorySlug,description,price,buyingPrice,globalPrice,stock,brand,model,condition,weight,compareAtPrice,shippingCost,handlerCost,competitorsPrice,isActive,showPrice,isFeatured,tags,metaTitle,metaDescription,focusKeyphrase,image1,image2,image3,image4,image5
                </code>
                <p className="text-xs text-gray-500">
                  The first row must be the header. Products with existing SKUs will be updated.
                  Category slugs must match existing categories (new categories will be auto-created).
                  Up to 5 image URLs can be specified. Optional fields can be left empty.
                </p>
              </div>

              <label className="flex items-center gap-3 text-sm cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={downloadImages}
                    onChange={(e) => setDownloadImages(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </div>
                <div>
                  <span className="font-medium text-gray-700">Download images from URLs</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    If enabled, images will be downloaded, watermarked, and stored locally.
                    If disabled, image URLs will be linked directly.
                  </p>
                </div>
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {isImporting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    <p className="text-sm text-gray-600">Importing products...</p>
                    {downloadImages && (
                      <p className="text-xs text-gray-400">Downloading and watermarking images...</p>
                    )}
                  </div>
                ) : importResult ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-800">Import complete</p>
                    <div className="flex gap-4 justify-center text-sm">
                      <span>
                        Created: <span className="font-medium text-green-600">{importResult.created}</span>
                      </span>
                      <span>
                        Updated: <span className="font-medium text-blue-600">{importResult.updated}</span>
                      </span>
                      <span>
                        Skipped: <span className="font-medium text-amber-600">{importResult.skipped}</span>
                      </span>
                    </div>
                    {importResult.errors.length > 0 && (
                      <details className="text-left mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer font-medium">
                          {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}
                        </summary>
                        <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                          {importResult.errors.map((err, idx) => (
                            <li key={idx} className="text-xs text-red-500 font-mono">
                              {err}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImportResult(null);
                        setIsImportModalOpen(false);
                      }}
                      className="mt-2"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag a CSV file here
                    </p>
                    <p className="text-xs text-gray-400">.csv files only</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3"
                    >
                      Select CSV File
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sample =
                      "name,slug,sku,categorySlug,description,price,buyingPrice,globalPrice,stock,brand,model,condition,weight,compareAtPrice,shippingCost,handlerCost,competitorsPrice,isActive,showPrice,isFeatured,tags,metaTitle,metaDescription,focusKeyphrase,image1,image2,image3,image4,image5\nSample Product,sample-product,SKU001,electronics,This is a sample product description,1000,500,800,10,BrandX,ModelA,New,1.5,,50,25,,true,true,false,electronics,tag1,tag2,Sample Meta Title,Sample meta description for SEO,sample keyword,https://example.com/image1.jpg,,,,,\n";
                    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", "products-sample.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download Sample
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lightbox ──────────────────────────────────── */}
      {lightboxProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxProduct(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
                {lightboxProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setLightboxProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image grid */}
            <div className="p-4">
              {lightboxProduct.images.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No images for this product.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {lightboxProduct.images.map((img, i) => (
                    <div
                      key={i}
                      className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center cursor-pointer"
                      style={{ minHeight: 180 }}
                      onClick={async () => {
                        try {
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          const imageEl = new window.Image();
                          await new Promise<void>((resolve, reject) => {
                            imageEl.onload = () => resolve();
                            imageEl.onerror = () => reject(new Error("Image load failed"));
                            imageEl.src = img.url;
                          });
                          canvas.width = imageEl.naturalWidth;
                          canvas.height = imageEl.naturalHeight;
                          ctx?.drawImage(imageEl, 0, 0);
                          const blob = await new Promise<Blob | null>((resolve) =>
                            canvas.toBlob(resolve, "image/png")
                          );
                          if (!blob) throw new Error("Failed to create image blob");
                          await navigator.clipboard.write([
                            new ClipboardItem({ "image/png": blob }),
                          ]);
                          toast.success("Image copied to clipboard!");
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : "Copy failed";
                          toast.error(msg);
                          window.open(img.url, "_blank");
                        }
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.alt || `${lightboxProduct.name} - Image ${i + 1}`}
                        className="w-full h-auto max-h-72 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="px-2 py-1 bg-white/90 text-gray-800 text-xs font-medium rounded shadow-sm pointer-events-none">
                          Click to copy
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Inline Editable Cell ───────────────────────────────
function EditableCell({
  isEditing,
  value,
  displayValue,
  onStart,
  onChange,
  onSave,
  onKeyDown,
  editPrefix,
}: {
  isEditing: boolean;
  value: string;
  displayValue: string;
  onStart: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  editPrefix?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="inline-flex items-center justify-end gap-0.5 h-7 w-full">
        {editPrefix && (
          <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{editPrefix}</span>
        )}
        <input
          ref={inputRef}
          type="number"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onSave}
          className="w-full min-w-0 max-w-[90px] px-1.5 py-0.5 rounded border border-brand text-xs text-right focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={onSave}
          className="p-0.5 text-green-600 hover:text-green-700 flex-shrink-0"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className="hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors cursor-text text-right h-7 inline-flex items-center justify-end w-full"
      title="Click to edit"
    >
      {displayValue}
    </button>
  );
}
