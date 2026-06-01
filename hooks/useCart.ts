"use client";

import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";

export function useCart() {
  const {
    items,
    isOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
    getItemCount,
    getSubtotal,
  } = useCartStore();

  return {
    items,
    isOpen,
    itemCount: useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0)),
    subtotal: useCartStore((s) =>
      s.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    ),
    formattedSubtotal: formatPrice(
      useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0))
    ),
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
    getItemCount,
    getSubtotal,
  };
}
