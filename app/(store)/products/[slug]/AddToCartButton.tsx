"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    image: string;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const handleAddToCart = () => {
    addItem(
      {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image,
        stock: product.stock,
      },
      quantity
    );
    setIsAdded(true);
    toast.success(`${product.name} added to cart!`);
    openCart();
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center border border-gray-200 rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2.5 hover:bg-gray-100 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-4 font-medium min-w-[3rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
            disabled={quantity >= product.stock}
            className="p-2.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          size="lg"
          className="flex-1"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {isAdded ? "Added!" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
