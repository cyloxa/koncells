"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Download,
  Upload,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  bulkDeleteCategories,
  exportCategoriesCsv,
  importCategoriesCsv,
} from "@/actions/admin.actions";
import { slugify } from "@/lib/utils";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count: { products: number };
}

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description ?? "");
    setImage(category.image ?? "");
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingCategory) {
      setSlug(slugify(value));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        image: image.trim() || undefined,
      };
      let result;
      if (editingCategory) {
        result = await updateCategory(editingCategory.id, data);
      } else {
        result = await createCategory(data);
      }
      if (result.success) {
        toast.success(editingCategory ? "Category updated" : "Category created");
        closeModal();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;
    if (category._count.products > 0) {
      toast.error(
        `Cannot delete "${category.name}" — it has ${category._count.products} product(s).`
      );
      return;
    }
    try {
      const result = await deleteCategory(category.id);
      if (result.success) {
        toast.success("Category deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  // ─── Bulk Selection ─────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} categor${selectedIds.size !== 1 ? "ies" : "y"}?`
      )
    )
      return;

    setIsBulkDeleting(true);
    try {
      const result = await bulkDeleteCategories(Array.from(selectedIds));
      if (result.success) {
        toast.success(`Deleted ${result.data.deletedCount} categor${result.data.deletedCount !== 1 ? "ies" : "y"}`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to bulk delete categories");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ─── CSV Export ─────────────────────────────────────

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportCategoriesCsv();
      if (result.success) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `categories-export-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Categories exported");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to export categories");
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
      const result = await importCategoriesCsv(text);
      if (result.success) {
        setImportResult(result.data);
        if (result.data.created > 0) {
          toast.success(`Imported ${result.data.created} categor${result.data.created !== 1 ? "ies" : "y"}`);
          router.refresh();
        }
        if (result.data.skipped > 0) {
          toast.error(`${result.data.skipped} categor${result.data.skipped !== 1 ? "ies" : "y"} skipped`);
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

  const allSelected = categories.length > 0 && selectedIds.size === categories.length;

  return (
    <>
      {/* Top bar: actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleSelectAll}>
            {allSelected ? (
              <CheckSquare className="h-4 w-4 mr-1.5" />
            ) : (
              <Square className="h-4 w-4 mr-1.5" />
            )}
            {allSelected ? "Deselect All" : "Select All"}
          </Button>

          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
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
                <th className="w-10 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Slug</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Products</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    selectedIds.has(category.id) ? "bg-brand-light/30" : ""
                  }`}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(category.id)}
                      onChange={() => toggleSelect(category.id)}
                      className="rounded border-gray-300 text-brand focus:ring-brand"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-brand-light flex items-center justify-center">
                          <span className="text-xs font-medium text-brand">
                            {category.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{category.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">{category.slug}</td>
                  <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                    {category.description ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center h-6 w-8 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                      {category._count.products}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category)}
                        disabled={category._count.products > 0}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No categories yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating add button */}
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark transition-all flex items-center justify-center z-30"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? "Edit Category" : "New Category"}
              </h2>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Category name"
                  error={errors.name}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Slug <span className="text-red-500">*</span>
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="category-slug"
                  error={errors.slug}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this category"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Image URL</label>
                <Input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://example.com/category-image.jpg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Import Categories from CSV</h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
                <p className="font-medium text-gray-800">CSV format:</p>
                <code className="block text-xs font-mono bg-white p-2 rounded border border-gray-200">
                  name,slug,description,image
                </code>
                <p className="text-xs text-gray-500">
                  The first row must be the header. Categories with existing slugs will be updated.
                  Description and image are optional.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {isImporting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    <p className="text-sm text-gray-600">Importing categories...</p>
                  </div>
                ) : importResult ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-800">Import complete</p>
                    <p className="text-sm text-gray-600">
                      Created: <span className="font-medium text-green-600">{importResult.created}</span>
                      {" | "}
                      Skipped: <span className="font-medium text-amber-600">{importResult.skipped}</span>
                    </p>
                    {importResult.errors.length > 0 && (
                      <details className="text-left mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer">
                          {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}
                        </summary>
                        <ul className="mt-1 space-y-0.5">
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
                    // Download a sample CSV
                    const sample =
                      "name,slug,description,image\nElectronics,electronics,Electronic devices and accessories,\nClothing,clothing,Apparel and fashion items,\n";
                    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", "categories-sample.csv");
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
    </>
  );
}
