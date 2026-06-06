import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { getDefaultExchangeRates } from "@/actions/exchange.actions";
import { getSeoSettings } from "@/actions/settings.actions";
import { getAllBrandsForSelect } from "@/actions/brand.actions";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  const [
    product,
    categories,
    allProducts,
    defaultRates,
    seoSettings,
    brandOptions,
  ] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        relatedTo: { select: { relatedProductId: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        parent: { select: { name: true } },
        _count: { select: { children: true } },
      },
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

  if (!product) notFound();

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    model: product.model,
    condition: product.condition,
    weight: product.weight ? Number(product.weight) : null,
    price: Number(product.price),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    globalPrice: product.globalPrice ? Number(product.globalPrice) : null,
    buyingPrice: product.buyingPrice ? Number(product.buyingPrice) : null,
    competitorsPrice: product.competitorsPrice ? Number(product.competitorsPrice) : null,
    shippingCost: product.shippingCost ? Number(product.shippingCost) : null,
    handlerCost: product.handlerCost ? Number(product.handlerCost) : null,
    stock: product.stock,
    isFeatured: product.isFeatured,
    showPrice: product.showPrice,
    isActive: product.isActive,
    sku: product.sku,
    categoryId: product.categoryId,
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    ogImage: product.ogImage ?? "",
    focusKeyphrase: product.focusKeyphrase ?? "",
    images: product.images.map((img) => ({
      url: img.url,
      alt: img.alt ?? "",
      title: img.title ?? "",
      position: img.position,
    })),
    relatedProductIds: product.relatedTo.map((r) => r.relatedProductId),
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-600 text-sm mt-1">
          Update the details for &quot;{product.name}&quot;.
        </p>
      </div>

      <ProductForm
        mode="edit"
        categories={categories}
        allProducts={allProducts}
        initialData={initialData}
        defaultRates={defaultRates}
        showSeoFields={seoSettings.showInProductForm}
        brandOptions={brandOptions}
      />
    </div>
  );
}
