"use client";

import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingCost = subtotal > 100 || subtotal === 0 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <ShoppingBag className="h-20 w-20 mb-6 text-gray-300" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="mb-8">Looks like you haven't added anything yet.</p>
          <Link href="/products">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {items.map((item) => (
                <CartItem
                  key={item.productId}
                  productId={item.productId}
                  name={item.name}
                  slug={item.slug}
                  price={item.price}
                  image={item.image}
                  quantity={item.quantity}
                  stock={item.stock}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </div>

          <div>
            <CartSummary
              subtotal={subtotal}
              shippingCost={shippingCost}
              tax={tax}
            />
            <Link href="/checkout" className="block mt-4">
              <Button className="w-full" size="lg">
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
