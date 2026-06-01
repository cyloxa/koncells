"use client";

import { useState, useEffect } from "react";

interface UseProductsOptions {
  category?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: "price-asc" | "price-desc" | "newest" | "name";
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { category, search, featured, page = 1, limit = 12, sort } = options;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (search) params.set("search", search);
        if (featured) params.set("featured", "true");
        if (page) params.set("page", String(page));
        if (limit) params.set("limit", String(limit));
        if (sort) params.set("sort", sort);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data.products ?? []);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, search, featured, page, limit, sort]);

  return { products, totalPages, loading, error };
}
