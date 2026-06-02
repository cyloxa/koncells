import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Price } from "@/components/common/Price";

interface ProductImage {
  url: string;
  alt: string | null;
}

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: ProductImage[];
  category?: { name: string };
  className?: string;
}

export function ProductCard({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  images,
  category,
  className,
}: ProductCardProps) {
  const primaryImage = images[0];

  return (
    <Link
      href={`/products/${slug}`}
      className={cn(
        "group block rounded-xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.alt ?? name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-12 w-12 text-gray-300" />
          </div>
        )}
        {/* Discount badge */}
        {compareAtPrice && compareAtPrice > price && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
            {Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}% OFF
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {category && (
          <p className="text-xs font-medium text-brand mb-1">{category.name}</p>
        )}
        <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-brand transition-colors">
          {name}
        </h3>
        <div className="mt-2">
          <Price price={price} compareAtPrice={compareAtPrice} size="sm" />
        </div>
      </div>
    </Link>
  );
}
