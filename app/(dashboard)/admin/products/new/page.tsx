import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { getDefaultExchangeRates } from "@/actions/exchange.actions";
import { getSeoSettings } from "@/actions/settings.actions";
import { getAllBrandsForSelect } from "@/actions/brand.actions";

export default async function NewProductPage() {
  const [categories, allProducts, defaultRates, seoSettings, brandOptions] =
    await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.product.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, sku: true },
      }),
      getDefaultExchangeRates(),
      getSeoSettings().catch(() => ({ showInProductForm: true })),
      getAllBrandsForSelect().then((brands) =>
        brands.map((b) => ({ value: b.name, label: b.name }))
      ),
    ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
        <p className="text-gray-600 text-sm mt-1">
          Fill in the details below to create a new product.
        </p>
      </div>

      <ProductForm
        mode="create"
        categories={categories}
        allProducts={allProducts}
        defaultRates={defaultRates}
        showSeoFields={seoSettings.showInProductForm}
        brandOptions={brandOptions}
      />
    </div>
  );
}
