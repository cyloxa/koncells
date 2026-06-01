import { Suspense } from "react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductFilters } from "@/components/product/ProductFilters";
import { Pagination } from "@/components/common/Pagination";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { getProducts, getCategories } from "@/actions/product.actions";
import { Loader2 } from "lucide-react";

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    featured?: string;
    page?: string;
    limit?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const { category, search, featured, sort } = params;

  const [{ products, totalPages }, categories] = await Promise.all([
    getProducts({ category, search, featured: featured === "true", page, sort }),
    getCategories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[{ label: "Products" }]}
        className="mb-6"
      />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {search ? `Results for "${search}"` : "All Products"}
          </h1>
          <p className="text-gray-600 mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <ProductFilters categories={categories} />
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }
          >
            <ProductGrid products={products} />
            <div className="mt-10">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseUrl="/products"
              />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
