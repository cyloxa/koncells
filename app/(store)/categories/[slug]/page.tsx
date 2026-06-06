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
      parent: { select: { id: true, name: true, slug: true } },
      children: { select: { id: true, slug: true, name: true } },
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

  // If this is a parent category, also fetch products from children
  let allProducts = category.products;
  let childNames: string[] = [];

  if (category.children.length > 0) {
    childNames = category.children.map((c) => c.name);
    const childProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { slug: { in: category.children.map((c) => c.slug) } },
      },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    allProducts = [...allProducts, ...childProducts];
    // Sort by createdAt desc
    allProducts.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: category.parent?.name ?? "Categories", href: category.parent ? `/categories/${category.parent.slug}` : "/products" },
          { label: category.name },
        ]}
        className="mb-6"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 mt-2">{category.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
        </p>
        {childNames.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Includes: {childNames.join(", ")}
          </p>
        )}
      </div>

      <ProductGrid
        products={allProducts.map((p) => ({
          ...p,
          price: Number(p.price),
          compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        }))}
      />

      {allProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-lg text-gray-500">No products found in this category.</p>
        </div>
      )}
    </div>
  );
}
