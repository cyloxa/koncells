import { cn, formatPrice } from "@/lib/utils";

interface PriceProps {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Price({ price, compareAtPrice, className, size = "md" }: PriceProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const hasDiscount = compareAtPrice && compareAtPrice > price;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-bold text-gray-900", sizeClasses[size])}>
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <span className="text-sm text-gray-500 line-through">
          {formatPrice(compareAtPrice)}
        </span>
      )}
    </div>
  );
}
