"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export function CheckoutForm() {
  const router = useRouter();
  const { items, removeItem, updateQuantity } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [addressId, setAddressId] = useState("");

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingCost = subtotal > 100 ? 0 : 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!addressId) {
      toast.error("Please enter a shipping address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create order");
      }

      const data = await response.json();
      toast.success("Order placed successfully!");
      router.push(`/checkout/success?orderId=${data.order.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Your cart is empty
        </h2>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart items */}
      <div className="lg:col-span-2">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cart
        </Link>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Checkout</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipping address */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Shipping Address
            </h3>
            <input
              type="text"
              placeholder="Enter your address ID (demo)"
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">
              In production, this would be a full address form. For demo, enter any value.
            </p>
          </div>

          {/* Cart items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Items</h3>
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

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Payment Method
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <CreditCard className="h-4 w-4 inline mr-1" />
                Stripe integration ready. Payment will be processed after placing the order.
              </p>
            </div>
          </div>

          {/* Mobile summary (visible only on small screens) */}
          <div className="lg:hidden">
            <CartSummary
              subtotal={subtotal}
              shippingCost={shippingCost}
              tax={tax}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? "Processing..." : `Place Order — ${formatPriceText(total)}`}
          </Button>
        </form>
      </div>

      {/* Sidebar summary (desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <CartSummary
            subtotal={subtotal}
            shippingCost={shippingCost}
            tax={tax}
          />
        </div>
      </div>
    </div>
  );
}

function formatPriceText(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}
