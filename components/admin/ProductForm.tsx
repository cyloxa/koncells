"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  X,
  Loader2,
  Upload,
  ImageIcon,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  SearchIcon,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { slugify } from "@/lib/utils";
import { createBrand } from "@/actions/brand.actions";
import { createProduct, updateProduct } from "@/actions/product.actions";
import toast from "react-hot-toast";
import type { ProductInput } from "@/types";
import type { DefaultRates } from "@/actions/exchange.actions";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

let imageKeyCounter = 0;
function nextImageKey(): number {
  return ++imageKeyCounter;
}

/** Evaluate a simple arithmetic expression like "2000+1500" or "2000+1500-500" */
function evaluateExpression(expr: string): number {
  if (!expr.trim()) return 0;
  // Allow only digits, +, -, *, /, ., and whitespace
  const sanitized = expr.replace(/[^0-9+\-*./\s]/g, "");
  if (!sanitized.trim()) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === "number" && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return 0;
  } catch {
    return 0;
  }
}

/** Format a number with 2 decimal places */
function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ImageEntry {
  _key: number;
  url: string;
  alt: string;
  title: string;
  position: number;
  uploading?: boolean;
}

interface ProductFormProps {
  mode: "create" | "edit";
  categories: CategoryOption[];
  allProducts: ProductOption[];
  initialData?: ProductInput & { id: string };
  defaultRates: DefaultRates;
  showSeoFields?: boolean;
  brandOptions: { value: string; label: string }[];
}

export function ProductForm({
  mode,
  categories,
  allProducts,
  initialData,
  defaultRates,
  showSeoFields = true,
  brandOptions,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  const imagesSectionRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Basic fields
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [model, setModel] = useState(initialData?.model ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [condition, setCondition] = useState(
    initialData?.condition ?? "New"
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );

  // ─── Pricing ─────────────────────────────────────────
  // Target selling price (manual LKR)
  const [price, setPrice] = useState(initialData?.price?.toString() ?? "");

  // USD price section: enter USD → auto-calc LKR using default USD rate
  const [usdAmount, setUsdAmount] = useState("");
  const [globalPrice, setGlobalPrice] = useState(
    initialData?.globalPrice?.toString() ?? ""
  );

  // Buying price section: enter CNY → auto-calc LKR using default CNY rate
  const [cnyAmount, setCnyAmount] = useState("");
  const [buyingPrice, setBuyingPrice] = useState(
    initialData?.buyingPrice?.toString() ?? ""
  );

  // Competitors price (manual LKR)
  const [competitorsPrice, setCompetitorsPrice] = useState(
    initialData?.competitorsPrice?.toString() ?? ""
  );

  // Costs (LKR, with expression evaluation)
  const [shippingCost, setShippingCost] = useState(
    initialData?.shippingCost?.toString() ?? ""
  );
  const [handlerCost, setHandlerCost] = useState(
    initialData?.handlerCost?.toString() ?? ""
  );

  // Derived calculations (LKR)
  // Product cost = buyingPrice (CNY→LKR) in LKR
  // Base price = product cost + shipping + handler
  // Profit = target selling price - base price
  // Profit margin % = (profit / target selling price) × 100
  const buyingPriceLkr = buyingPrice ? Number(buyingPrice) : 0;
  const shippingLkr = shippingCost ? evaluateExpression(shippingCost) : 0;
  const handlerLkr = handlerCost ? evaluateExpression(handlerCost) : 0;
  const productCost = buyingPriceLkr;
  const basePrice = productCost + shippingLkr + handlerLkr;
  const sellingPrice = price ? Number(price) : 0;
  const derivedProfit = sellingPrice > 0 ? sellingPrice - basePrice : 0;
  const profitMargin =
    sellingPrice > 0 ? ((derivedProfit / sellingPrice) * 100) : 0;

  // Inventory
  const [sku, setSku] = useState(initialData?.sku ?? "");
  const [skuNumber, setSkuNumber] = useState("");
  const [stock, setStock] = useState(initialData?.stock?.toString() ?? "0");
  const [weight, setWeight] = useState(initialData?.weight?.toString() ?? "");

  // Auto-generate SKU from Brand name + number
  useEffect(() => {
    if (isEdit) return; // Don't auto-regenerate SKU when editing
    const brandPrefix = brand
      ? brand.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
      : "GEN";
    if (skuNumber) {
      const newSku = `${brandPrefix}-${skuNumber}`;
      setSku(newSku);
    }
  }, [brand, skuNumber, isEdit]);

  // Images
  const [images, setImages] = useState<ImageEntry[]>(
    initialData?.images?.map((img) => ({
      _key: nextImageKey(),
      url: img.url,
      alt: img.alt ?? "",
      title: (img as any).title ?? "",
      position: img.position,
    })) ?? []
  );

  // Related products
  const [relatedProductIds, setRelatedProductIds] = useState<string[]>(
    initialData?.relatedProductIds ?? []
  );
  const [relatedSearch, setRelatedSearch] = useState("");

  // Settings
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [showPrice, setShowPrice] = useState(initialData?.showPrice ?? true);

  // Standard Price (higher than selling price, shows OFF%)
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialData?.compareAtPrice?.toString() ?? ""
  );
  const standardPriceNum = compareAtPrice ? Number(compareAtPrice) : 0;
  const sellingPriceNum2 = price ? Number(price) : 0;
  const offPercent =
    standardPriceNum > 0 && sellingPriceNum2 > 0
      ? Math.round(((standardPriceNum - sellingPriceNum2) / standardPriceNum) * 100)
      : 0;

  // Auto-generate slug from name
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!isEdit) {
        setSlug(slugify(value));
      }
    },
    [isEdit]
  );

  // ─── SEO Fields ──────────────────────────────────────
  const [metaTitle, setMetaTitle] = useState(
    initialData?.metaTitle ?? ""
  );
  const [metaDescription, setMetaDescription] = useState(
    initialData?.metaDescription ?? ""
  );
  const [ogImage, setOgImage] = useState(
    initialData?.ogImage ?? ""
  );
  const [focusKeyphrase, setFocusKeyphrase] = useState(
    initialData?.focusKeyphrase ?? ""
  );

  // ─── Image upload ─────────────────────────────────────
  const uploadFile = useCallback(
    async (file: File, seoName?: string, position?: number): Promise<string | null> => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `${file.name}: Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.`
        );
        return null;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File is too large (max 10MB).`);
        return null;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (seoName) formData.append("seoName", seoName);
      if (position !== undefined) formData.append("position", String(position));

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Upload failed");
        }

        const data = await res.json();
        return data.url as string;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        toast.error(message);
        return null;
      }
    },
    []
  );

  // ─── USD auto-calc ────────────────────────────────────
  const handleUsdChange = (value: string) => {
    setUsdAmount(value);
    const usd = parseFloat(value);
    if (!isNaN(usd) && defaultRates.usdToLkr) {
      setGlobalPrice((usd * defaultRates.usdToLkr).toFixed(2));
    } else if (!value.trim()) {
      setGlobalPrice("");
    }
  };

  // ─── CNY auto-calc ────────────────────────────────────
  const handleCnyChange = (value: string) => {
    setCnyAmount(value);
    const cny = parseFloat(value);
    if (!isNaN(cny) && defaultRates.cnyToLkr) {
      setBuyingPrice((cny * defaultRates.cnyToLkr).toFixed(2));
    } else if (!value.trim()) {
      setBuyingPrice("");
    }
  };

  // ─── Expression evaluation on blur ────────────────────
  const handleExpressionBlur = (
    value: string,
    setter: (v: string) => void
  ) => {
    if (!value.trim()) return;
    // Check if the value contains operators
    if (/[+\-*/]/.test(value)) {
      const result = evaluateExpression(value);
      setter(result.toString());
    }
  };

  const addImagesFromFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);

      // Generate SEO-safe filename base from product name
      const seoBase = slugify(name || "product") || "product";

      const newEntries: ImageEntry[] = fileArray.map((file, i) => ({
        _key: nextImageKey(),
        url: "",
        alt: "",
        title: "",
        position: images.length + i,
        uploading: true,
      }));

      setImages((prev) => [...prev, ...newEntries]);

      for (let i = 0; i < fileArray.length; i++) {
        const position = images.length + i;
        const url = await uploadFile(fileArray[i], seoBase, position + 1);
        if (url) {
          setImages((prev) => {
            const next = [...prev];
            const uploadIndex = next.findLastIndex(
              (e) => e.uploading === true && e.url === ""
            );
            if (uploadIndex >= 0) {
              // Auto-generate alt text from product name
              const autoAlt = name.trim()
                ? `Koncells - ${name.trim()}${position > 0 ? ` - Image ${position + 1}` : ""}`
                : `Koncells product image ${position + 1}`;
              next[uploadIndex] = {
                ...next[uploadIndex],
                url,
                alt: autoAlt,
                uploading: false,
              };
            }
            return next;
          });
        } else {
          setImages((prev) => {
            const failIndex = prev.findLastIndex(
              (e) => e.uploading === true && e.url === ""
            );
            if (failIndex >= 0) {
              return prev
                .filter((_, fi) => fi !== failIndex)
                .map((img, fi) => ({ ...img, position: fi }));
            }
            return prev;
          });
        }
      }
    },
    [uploadFile, name, images.length]
  );

  // File input handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImagesFromFiles(e.target.files);
      e.target.value = "";
    }
  };

  // OG Image upload handler
  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, `og-${slugify(name || "social")}`, 0);
    if (url) {
      setOgImage(url);
    }
    e.target.value = "";
  };

  // ─── Paste handler (global, but skips if focus is on a text input) ─
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept paste when user is typing in an input/textarea
      const activeEl = document.activeElement;
      const isTextField =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement &&
          activeEl.isContentEditable);
      if (isTextField) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const renamedFile = new File(
              [file],
              `pasted-${Date.now()}.${file.type.split("/")[1] || "png"}`,
              { type: file.type }
            );
            imageFiles.push(renamedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        toast.success(
          `Pasted ${imageFiles.length} image(s). Uploading...`
        );
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((f) => dataTransfer.items.add(f));
        await addImagesFromFiles(dataTransfer.files);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [addImagesFromFiles]);

  // Remove image by key
  const removeImage = (key: number) => {
    setImages((prev) =>
      prev
        .filter((img) => img._key !== key)
        .map((img, i) => ({ ...img, position: i }))
    );
  };

  // Update alt text by key
  const updateAlt = (key: number, alt: string) => {
    setImages((prev) =>
      prev.map((img) => (img._key === key ? { ...img, alt } : img))
    );
  };

  // Update image title by key
  const updateImageTitle = (key: number, title: string) => {
    setImages((prev) =>
      prev.map((img) => (img._key === key ? { ...img, title } : img))
    );
  };

  // ─── Image editing modal ──────────────────────────────
  const [editingImage, setEditingImage] = useState<ImageEntry | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const openEditModal = (image: ImageEntry) => {
    setEditingImage(image);
    setEditAlt(image.alt);
    setEditTitle(image.title);
  };

  const saveEditModal = () => {
    if (!editingImage) return;
    setImages((prev) =>
      prev.map((img) =>
        img._key === editingImage._key
          ? { ...img, alt: editAlt, title: editTitle }
          : img
      )
    );
    setEditingImage(null);
  };

  // ─── Drag and drop reorder ────────────────────────────
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    setImages((prev) => {
      const next = [...prev];
      const dragged = next[dragIndex];
      next.splice(dragIndex, 1);
      next.splice(index, 0, dragged);
      return next.map((img, i) => ({ ...img, position: i }));
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  // ─── Related products search ──────────────────────────
  const toggleRelatedProduct = (productId: string) => {
    setRelatedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    setRelatedSearch("");
  };

  const filteredRelatedProducts = allProducts
    .filter((p) => p.id !== initialData?.id)
    .filter(
      (p) =>
        !relatedSearch.trim() ||
        p.name.toLowerCase().includes(relatedSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(relatedSearch.toLowerCase())
    );

  // ─── Validate ─────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Product name is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
    if (!description.trim() || description.trim().length < 10)
      newErrors.description = "Description must be at least 10 characters";
    if (!price || Number(price) <= 0) newErrors.price = "Price must be positive";
    if (!sku.trim()) newErrors.sku = "SKU is required";
    if (!categoryId) newErrors.categoryId = "Category is required";
    if (stock && Number(stock) < 0) newErrors.stock = "Stock cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const imagesPayload = images
      .filter((img) => img.url.trim() && !img.uploading)
      .map((img, i) => ({
        url: img.url,
        alt: img.alt || null,
        title: img.title || null,
        position: i,
      }));

    const formData: ProductInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      condition: condition || null,
      weight: weight ? Number(weight) : null,
      price: Number(price),
      globalPrice: globalPrice ? Number(globalPrice) : null,
      buyingPrice: buyingPrice ? Number(buyingPrice) : null,
      competitorsPrice: competitorsPrice ? Number(competitorsPrice) : null,
      shippingCost: shippingCost ? Number(shippingCost) : null,
      handlerCost: handlerCost ? Number(handlerCost) : null,
      stock: Number(stock),
      sku: sku.trim(),
      categoryId,
      isActive,
      isFeatured: initialData?.isFeatured ?? false,
      showPrice,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      ogImage: ogImage.trim() || null,
      focusKeyphrase: focusKeyphrase.trim() || null,
      images: imagesPayload,
      relatedProductIds,
    };

    try {
      let result;
      if (isEdit && initialData) {
        result = await updateProduct(initialData.id, formData);
      } else {
        result = await createProduct(formData);
      }

      if (result.success) {
        toast.success(
          isEdit
            ? "Product updated successfully"
            : "Product created successfully"
        );
        router.push("/admin/products");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ─── 1. Images ────────────────────────────────── */}
      <section
        className="bg-white rounded-xl border border-gray-200 p-6"
        ref={imagesSectionRef}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Images</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Paste an image (Ctrl+V / Cmd+V) or click Browse to upload.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Browse
            </Button>
          </div>
        </div>

        {/* Paste zone / drop area */}
        <div
          className="mb-4 p-6 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-brand/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Paste an image from clipboard, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supports JPEG, PNG, WebP, GIF &mdash; Max 10MB each
          </p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm">
              No images added yet. Paste an image or click &quot;Browse&quot; to
              get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image._key}
                draggable={!image.uploading}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group rounded-lg overflow-hidden border transition-all duration-200 ${
                  image.uploading
                    ? "border-brand/30 bg-brand-light/30"
                    : dragIndex === index
                    ? "border-brand border-2 opacity-50 scale-95"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                } ${!image.uploading ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                {/* Image preview - click to edit */}
                <div
                  className="aspect-square bg-gray-100"
                  onClick={() => !image.uploading && image.url && openEditModal(image)}
                >
                  {image.uploading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-brand mx-auto" />
                        <p className="text-xs text-gray-500 mt-1">
                          Watermarking...
                        </p>
                      </div>
                    </div>
                  ) : image.url ? (
                    <div className="relative h-full w-full">
                      <img
                        src={image.url}
                        alt={image.alt || "Product image"}
                        className="w-full h-full object-cover"
                      />
                      {!image.uploading && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="px-2 py-1 bg-white/90 text-gray-800 text-[10px] font-medium rounded shadow-sm">
                            Click to edit
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Drag handle indicator */}
                {!image.uploading && image.url && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-4 w-4 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                )}

                {/* Badges */}
                {index === 0 && !image.uploading && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-brand text-white text-[10px] font-medium rounded shadow-sm">
                    Primary
                  </span>
                )}
                {image.uploading && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-medium rounded">
                    Uploading
                  </span>
                )}

                {/* Delete button */}
                {!image.uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(image._key);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                    title="Remove image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Alt/Title summary */}
                {!image.uploading && image.url && (
                  <div className="p-2 bg-white border-t border-gray-100">
                    <p className="text-[10px] text-gray-500 truncate">
                      {image.alt ? (
                        <span title={image.alt}>{image.alt}</span>
                      ) : (
                        <span className="italic text-gray-300">No alt text</span>
                      )}
                    </p>
                    {image.title && (
                      <p className="text-[9px] text-gray-400 truncate mt-0.5">
                        Title: {image.title}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Image Edit Modal ──────────────────────── */}
        {editingImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setEditingImage(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Edit Image</h3>
                <button
                  type="button"
                  onClick={() => setEditingImage(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Preview */}
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={editingImage.url}
                    alt={editAlt || "Preview"}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Alt text */}
                <div className="space-y-1.5">
                  <Label>Alt Text (SEO)</Label>
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder='e.g. "Koncells - Wireless Headphones - Front View"'
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400">
                    Describes the image for search engines and screen readers.
                    Use natural language.
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label>Title (Tooltip)</Label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder='e.g. "Koncells Wireless Headphones"'
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400">
                    Appears as a tooltip when hovering over the image. Optional
                    but recommended.
                  </p>
                </div>

                {/* Preview of how it looks */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    HTML Preview
                  </p>
                  <code className="text-xs text-gray-600 break-all">
                    {`<img src="${editingImage.url.slice(0, 40)}..." alt="${editAlt || ""}" title="${editTitle || ""}" />`}
                  </code>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingImage(null)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={saveEditModal}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── 2. Basic Information ──────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Brand</Label>
            <SearchableSelect
              options={brandOptions}
              value={brand}
              onChange={(val, label) => {
                const isExistingBrand = brandOptions.some(
                  (b) => b.label.toLowerCase() === label.toLowerCase()
                );
                if (label && !isExistingBrand) {
                  createBrand({ name: label }).catch(() => {});
                }
                setBrand(label);
              }}
              placeholder="Select or type a brand..."
              searchPlaceholder="Search brands..."
              allowCustom
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. iPhone 15 Pro Max"
            />
          </div>
          <div className="space-y-2">
            <Label required>Product Name</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter product name"
              error={errors.name}
            />
          </div>
          <div className="space-y-2">
            <Label required>Category</Label>
            <SearchableSelect
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              placeholder="Select category..."
              searchPlaceholder="Search categories..."
              error={errors.categoryId}
            />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            >
              <option value="New">New</option>
              <option value="Used">Used</option>
              <option value="Refurbished">Refurbished</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label required>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="product-url-slug"
              error={errors.slug}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label required>Product Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product in detail..."
              rows={5}
              error={errors.description}
            />
          </div>
        </div>
      </section>

      {/* ─── 3. Inventory ──────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Inventory
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label required>SKU</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder={isEdit ? "e.g. APPLE-001" : "Auto-generated from brand + number"}
                  error={errors.sku}
                />
              </div>
              {!isEdit && (
                <div className="w-28 flex-shrink-0">
                  <input
                    type="text"
                    value={skuNumber}
                    onChange={(e) => setSkuNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Number"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>
              )}
            </div>
            {!isEdit && brand && skuNumber && (
              <p className="text-xs text-green-600">
                Generated SKU: <span className="font-mono font-semibold">{sku}</span>
              </p>
            )}
            {!isEdit && !skuNumber && (
              <p className="text-xs text-gray-400">
                Enter a number above to auto-generate SKU as{" "}
                <span className="font-mono">
                  {brand ? brand.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "") : "BRAND"}
                  -{"[NUMBER]"}
                </span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Stock</Label>
            <Input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
              error={errors.stock}
            />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </section>

      {/* ─── 4. Pricing ────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Pricing
        </h2>

        {/* 1. Buying Price (CNY → LKR) */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Buying Price (CNY &rarr; LKR)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Supplier Price (CNY)</Label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cnyAmount}
                onChange={(e) => handleCnyChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Current CNY &rarr; LKR Rate</Label>
              <div className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
                {defaultRates.cnyToLkr
                  ? `1 CNY = ${defaultRates.cnyToLkr.toFixed(2)} LKR`
                  : "No default rate set"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product Cost (LKR)</Label>
              <div className="px-3 py-2.5 rounded-lg border border-gray-200 bg-green-50/50 text-sm font-medium text-gray-900">
                {buyingPrice
                  ? `Rs. ${Number(buyingPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* 2. Costs Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Costs (LKR)
            </h3>
            <span className="text-xs text-gray-400 ml-1">
              (Supports expressions like &quot;2000+1500&quot;)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shipping Cost (LKR)</Label>
              <input
                type="text"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                onBlur={(e) =>
                  handleExpressionBlur(e.target.value, setShippingCost)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Tab") {
                    handleExpressionBlur(
                      (e.target as HTMLInputElement).value,
                      setShippingCost
                    );
                  }
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder='e.g. "2000+1500" or "3500"'
              />
              {shippingCost && /[+\-*/]/.test(shippingCost) && (
                <p className="text-xs text-green-600">
                  = Rs. {fmt(evaluateExpression(shippingCost))}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Handler Cost (LKR)</Label>
              <input
                type="text"
                value={handlerCost}
                onChange={(e) => setHandlerCost(e.target.value)}
                onBlur={(e) =>
                  handleExpressionBlur(e.target.value, setHandlerCost)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Tab") {
                    handleExpressionBlur(
                      (e.target as HTMLInputElement).value,
                      setHandlerCost
                    );
                  }
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder='e.g. "500+200" or "700"'
              />
              {handlerCost && /[+\-*/]/.test(handlerCost) && (
                <p className="text-xs text-green-600">
                  = Rs. {fmt(evaluateExpression(handlerCost))}
                </p>
              )}
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* 3. USD Price Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              USD Price (Auto-calculated to LKR)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>USD Amount</Label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={usdAmount}
                onChange={(e) => handleUsdChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Current USD &rarr; LKR Rate</Label>
              <div className="px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
                {defaultRates.usdToLkr
                  ? `1 USD = ${defaultRates.usdToLkr.toFixed(2)} LKR`
                  : "No default rate set"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Global Price (LKR)</Label>
              <div className="px-3 py-2.5 rounded-lg border border-gray-200 bg-brand-light/50 text-sm font-medium text-gray-900">
                {globalPrice
                  ? `Rs. ${Number(globalPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* 4. Competitors Price + Standard Price + Target Selling Price */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <Label>Competitors Price (LKR)</Label>
            <div className="relative">
              <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={competitorsPrice}
                onChange={(e) => setCompetitorsPrice(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Standard Price (LKR)</Label>
            <div className="relative">
              <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-400">
              Higher reference price shown crossed-out on storefront.
            </p>
          </div>
          <div className="space-y-2">
            <Label required>Target Selling Price (LKR)</Label>
            <div className="relative">
              <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            {offPercent > 0 && (
              <p className="text-xs text-green-600 font-medium">
                OFF: {offPercent}%
              </p>
            )}
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* 5. Automatic Calculations */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Automatic Calculations
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                Base Price (LKR)
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {fmt(basePrice)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Cost + Shipping + Handler
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-green-600 font-medium uppercase tracking-wider">
                Profit (LKR)
              </p>
              <p className={`text-xl font-bold mt-1 ${derivedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {derivedProfit >= 0 ? "+" : ""}{fmt(derivedProfit)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Selling Price &minus; Base Price
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">
                Profit Margin
              </p>
              <p className={`text-xl font-bold mt-1 ${profitMargin >= 0 ? "text-purple-600" : "text-red-600"}`}>
                {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Profit &divide; Selling Price
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. SEO & Social Preview ───────────────────── */}
      {showSeoFields && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <SearchIcon className="h-4 w-4 text-gray-400" />
            SEO &amp; Social Preview
            {focusKeyphrase && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full">
                Keyphrase: &quot;{focusKeyphrase}&quot;
              </span>
            )}
          </h2>

          {/* Focus Keyphrase */}
          <div className="mb-6">
            <Label>Focus Keyphrase</Label>
            <Input
              value={focusKeyphrase}
              onChange={(e) => setFocusKeyphrase(e.target.value)}
              placeholder='e.g. "iphone 15 pro max price in sri lanka"'
            />
            <p className="text-xs text-gray-400 mt-1">
              The primary keyword you&apos;re optimizing this product for. Helps
              keep your SEO writing on track.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Title */}
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={name || "Meta title (defaults to product name)"}
                maxLength={70}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Title tag for search results. {metaTitle ? `${metaTitle.length}/70` : "Defaults to product name if empty."}
                </p>
                <span className={`text-[10px] font-medium ${metaTitle.length > 70 ? "text-red-500" : metaTitle.length > 60 ? "text-yellow-500" : "text-green-500"}`}>
                  {metaTitle.length}/70
                </span>
              </div>
            </div>

            {/* OG Image */}
            <div className="space-y-2">
              <Label>Social Share Image (OG Image)</Label>
              <div className="relative">
                <input
                  type="text"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="/uploads/social-image.jpg"
                  className="w-full pl-3 pr-20 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <input
                    ref={ogImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleOgImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => ogImageInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                    Browse
                  </button>
                </div>
              </div>
              {ogImage && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-sm">
                  <img
                    src={ogImage}
                    alt="OG Preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-gray-400">
                Optional. Leave empty to use the first product image. Recommended
                size: 1200&times;630px.
              </p>
            </div>

            {/* Meta Description */}
            <div className="space-y-2 md:col-span-2">
              <Label>Meta Description</Label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="A concise description for search snippets (150-160 characters recommended)"
                rows={3}
                maxLength={160}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Appears below the title in search results. 
                  {metaDescription ? `${metaDescription.length}/160` : "Defaults to product description if empty."}
                </p>
                <span className={`text-[10px] font-medium ${metaDescription.length > 160 ? "text-red-500" : metaDescription.length > 150 ? "text-yellow-500" : "text-green-500"}`}>
                  {metaDescription.length}/160
                </span>
              </div>
            </div>
          </div>

          {/* Live search preview */}
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-white">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Search Result Preview
            </p>
            <div className="max-w-lg">
              <p className="text-sm text-blue-700 hover:underline cursor-pointer font-normal truncate">
                {(metaTitle || name || "Product Title") + " | Koncells"}
              </p>
              <p className="text-xs text-green-700 truncate">
                {`${process.env.NEXT_PUBLIC_APP_URL || ""}/products/${slug || "product-slug"}`}
              </p>
              <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                {(metaDescription || description || "Product description will appear here...").slice(0, 160)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── 6. Settings (Toggles) ────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Settings</h2>
        <div className="space-y-5">
          <Switch
            checked={showPrice}
            onChange={setShowPrice}
            label="Show price on user pages"
          />
          <p className="text-xs text-gray-400 ml-14 -mt-3">
            When enabled, the product price will be displayed on the storefront.
          </p>
          <div className="border-t border-gray-100 pt-5">
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Show product on website"
            />
            <p className="text-xs text-gray-400 ml-14 mt-1">
              When enabled, the product will be visible to customers on the
              storefront.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 7. Related Products ────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Related Products
        </h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={relatedSearch}
            onChange={(e) => setRelatedSearch(e.target.value)}
            placeholder="Search products by name or SKU..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          {relatedSearch && (
            <button
              type="button"
              onClick={() => setRelatedSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Selected count */}
        {relatedProductIds.length > 0 && (
          <p className="text-xs text-brand font-medium mb-2">
            {relatedProductIds.length} product
            {relatedProductIds.length > 1 ? "s" : ""} selected
          </p>
        )}

        {/* Product list */}
        {filteredRelatedProducts.length === 0 && allProducts.length <= 1 ? (
          <p className="text-sm text-gray-400">
            No other products available. Create more products first.
          </p>
        ) : filteredRelatedProducts.length === 0 && relatedSearch ? (
          <p className="text-sm text-gray-400">
            No products match &quot;{relatedSearch}&quot;
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {filteredRelatedProducts.map((product) => (
              <label
                key={product.id}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                  relatedProductIds.includes(product.id)
                    ? "bg-brand-light/50"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={relatedProductIds.includes(product.id)}
                  onChange={() => toggleRelatedProduct(product.id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Search and select related products to show as recommendations.
        </p>
      </section>

      {/* ─── Submit ────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
