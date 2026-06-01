import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumb } from "@/components/common/Breadcrumb";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!category) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[{ label: "Categories" }, { label: category.name }]}
        className="mb-6"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 mt-2">{category.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {category.products.length} product{category.products.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ProductGrid products={category.products} />

      {category.products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-lg text-gray-500">No products found in this category.</p>
        </div>
      )}
    </div>
  );
}
