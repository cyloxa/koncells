import { ProductCard } from "@/components/product/ProductCard";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: { url: string; alt: string | null }[];
  category?: { name: string };
}

interface ProductGridProps {
  products: Product[];
  className?: string;
}

export function ProductGrid({ products, className }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
        className
      )}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          slug={product.slug}
          price={Number(product.price)}
          compareAtPrice={
            product.compareAtPrice ? Number(product.compareAtPrice) : null
          }
          images={product.images}
          category={product.category}
        />
      ))}
    </div>
  );
}
