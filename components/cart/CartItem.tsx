"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface CartItemProps {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({
  productId,
  name,
  slug,
  price,
  image,
  quantity,
  stock,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  return (
    <div className="flex gap-4 py-4 border-b border-gray-200">
      {/* Image */}
      <Link
        href={`/products/${slug}`}
        className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
      >
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${slug}`}
          className="text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2 transition-colors"
        >
          {name}
        </Link>
        <p className="text-sm font-semibold text-gray-900 mt-1">
          {formatPrice(price)}
        </p>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={() => onUpdateQuantity(productId, quantity - 1)}
              className="p-1.5 hover:bg-gray-100 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 text-sm font-medium">{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(productId, quantity + 1)}
              disabled={quantity >= stock}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => onRemove(productId)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">
          {formatPrice(price * quantity)}
        </p>
      </div>
    </div>
  );
}
