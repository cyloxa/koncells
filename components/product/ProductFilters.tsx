"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
  categories?: { id: string; name: string; slug: string }[];
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

  const currentCategory = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

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
            <div className="space-y-2">
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
              {categories.map((cat) => (
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
