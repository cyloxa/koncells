"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
  Pencil,
  Check,
  Upload,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import {
  createBrand,
  updateBrand,
  deleteBrand,
  bulkDeleteBrands,
  importBrandsFromCSV,
} from "@/actions/brand.actions";
import toast from "react-hot-toast";

interface BrandData {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export function BrandsTab({ initialBrands }: { initialBrands: BrandData[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // CSV import
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    const result = await createBrand({ name: newName.trim() });
    if (result.success) {
      toast.success(`Brand "${result.data.name}" created`);
      setNewName("");
      setBrands((prev) =>
        [
          ...prev,
          { id: result.data.id, name: result.data.name, slug: "", createdAt: new Date(), updatedAt: new Date() },
        ].sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      toast.error(result.error);
    }
    setIsAdding(false);
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSavingId(id);
    const result = await updateBrand(id, { name: editName.trim() });
    if (result.success) {
      toast.success("Brand updated");
      setBrands((prev) =>
        prev
          .map((b) => (b.id === id ? { ...b, name: result.data.name } : b))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } else {
      toast.error(result.error);
    }
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    setSavingId(id);
    const result = await deleteBrand(id);
    if (result.success) {
      toast.success("Brand deleted");
      setBrands((prev) => prev.filter((b) => b.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      toast.error(result.error);
    }
    setSavingId(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await bulkDeleteBrands(ids);
    if (result.success) {
      toast.success(`${result.data.count} brand(s) deleted`);
      setBrands((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
    } else {
      toast.error(result.error);
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
    if (selectedIds.size === filteredBrands.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBrands.map((b) => b.id)));
    }
  };

  // ─── CSV Import ────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setShowCsvImport(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setIsImporting(true);
    const result = await importBrandsFromCSV(csvText);
    if (result.success) {
      toast.success(
        `${result.data.created} brand(s) imported.${
          result.data.skipped.length > 0
            ? ` ${result.data.skipped.length} skipped (duplicates).`
            : ""
        }`
      );
      setShowCsvImport(false);
      setCsvText("");
      window.location.reload();
    } else {
      toast.error(result.error);
    }
    setIsImporting(false);
  };

  const downloadSampleCsv = () => {
    const sample = `Sony\nApple\nSamsung\nNike\nAdidas\nLG\nDell\nHP\n`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brands-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Brand Management
        </h3>
        <p className="text-sm text-gray-600">
          Add, edit, or remove brands. These will appear as searchable options
          in the product form.
        </p>
      </div>

      {/* Add new brand + CSV import buttons */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter brand name..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={isAdding || !newName.trim()}
        >
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Brand
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* CSV Import panel */}
      {showCsvImport && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-gray-900">Import Brands from CSV</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCsvImport(false);
                setCsvText("");
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>CSV file loaded.</span>
              <span className="text-xs text-gray-400">
                ({csvText.split("\n").filter((l) => l.trim()).length} brand(s) detected)
              </span>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
              placeholder="Or paste CSV data here..."
            />

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Download className="h-3.5 w-3.5" />
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-brand hover:underline"
              >
                Download sample CSV
              </button>
              <span className="text-gray-300">|</span>
              <span>One brand name per line, or CSV with first column as name</span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleCsvImport}
                disabled={isImporting || !csvText.trim()}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Import {csvText.split("\n").filter((l) => l.trim()).length} Brand(s)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCsvImport(false);
                  setCsvText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search & bulk actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
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
        {selectedIds.size > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Brands list */}
      {filteredBrands.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          {search
            ? "No brands match your search."
            : "No brands added yet. Add your first brand above or import via CSV."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={
                      filteredBrands.length > 0 &&
                      selectedIds.size === filteredBrands.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Brand Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">
                  Slug
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((brand) => (
                <tr
                  key={brand.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(brand.id) ? "bg-brand-light/30" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(brand.id)}
                      onChange={() => toggleSelect(brand.id)}
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="py-3 px-4">
                    {editingId === brand.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEdit(brand.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full px-2 py-1 rounded border border-brand text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleEdit(brand.id)}
                          disabled={savingId === brand.id}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          {savingId === brand.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">
                        {brand.name}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {brand.slug}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(brand.id);
                          setEditName(brand.name);
                        }}
                        className="p-1.5 text-gray-400 hover:text-brand rounded-lg hover:bg-gray-100 transition-colors"
                        title="Edit brand"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(brand.id)}
                        disabled={savingId === brand.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete brand"
                      >
                        {savingId === brand.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        {brands.length} brand{brands.length !== 1 ? "s" : ""} total
        {search && ` (${filteredBrands.length} filtered)`}
      </p>
    </div>
  );
}
