"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFilter {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
  _count: { products: number; children: number };
}

interface ProductFiltersProps {
  categories?: CategoryFilter[];
  className?: string;
}

const sortOptions = [
  { value: "", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A-Z" },
];

export function ProductFilters({ categories, className }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const currentCategory = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  const topLevelCategories = (categories ?? []).filter((c) => !c.parentId);
  const childCategories = (categories ?? []).filter((c) => c.parentId);

  const getChildren = (parentId: string) =>
    childCategories.filter((c) => c.parentId === parentId);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete("page"); // Reset page on filter change
      return params.toString();
    },
    [searchParams]
  );

  const clearFilters = () => {
    router.push("/products");
  };

  const hasActiveFilters = currentCategory || currentSort;

  const toggleParent = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {hasActiveFilters && (
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-brand text-white text-xs">
            !
          </span>
        )}
      </button>

      {/* Filter panel */}
      <div className={cn("space-y-6", isOpen ? "block" : "hidden md:block")}>
        {/* Active filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <X className="h-3 w-3" />
            Clear all filters
          </button>
        )}

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
            <div className="space-y-1">
              <button
                onClick={() =>
                  router.push(`/products?${createQueryString("category", "")}`)
                }
                className={cn(
                  "block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors",
                  !currentCategory
                    ? "bg-brand-light text-brand font-medium"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                All Categories
              </button>

              {/* Top-level parents with expand */}
              {topLevelCategories.map((cat) => {
                const children = getChildren(cat.id);
                const isExpanded = expandedParents.has(cat.id);

                return (
                  <div key={cat.id}>
                    <div className="flex items-center">
                      {children.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleParent(cat.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-5.5" />
                      )}
                      <button
                        onClick={() =>
                          router.push(
                            `/products?${createQueryString("category", cat.slug)}`
                          )
                        }
                        className={cn(
                          "flex-1 text-left text-sm px-2 py-1.5 rounded-lg transition-colors",
                          currentCategory === cat.slug
                            ? "bg-brand-light text-brand font-medium"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {cat.name}
                      </button>
                    </div>

                    {/* Child categories */}
                    {isExpanded &&
                      children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() =>
                            router.push(
                              `/products?${createQueryString("category", child.slug)}`
                            )
                          }
                          className={cn(
                            "block w-full text-left text-sm pl-9 pr-3 py-1.5 rounded-lg transition-colors",
                            currentCategory === child.slug
                              ? "bg-brand-light text-brand font-medium"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          {child.name}
                        </button>
                      ))}
                  </div>
                );
              })}

              {/* Orphaned children (no parent) */}
              {childCategories
                .filter((c) => !topLevelCategories.find((p) => p.id === c.parentId))
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      router.push(
                        `/products?${createQueryString("category", cat.slug)}`
                      )
                    }
                    className={cn(
                      "block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors",
                      currentCategory === cat.slug
                        ? "bg-brand-light text-brand font-medium"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Sort */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
          <div className="space-y-2">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  router.push(
                    `/products?${createQueryString("sort", option.value)}`
                  )
                }
                className={cn(
                  "block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors",
                  currentSort === option.value
                    ? "bg-brand-light text-brand font-medium"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
