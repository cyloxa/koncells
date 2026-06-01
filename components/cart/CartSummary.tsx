"use client";

import { formatPrice } from "@/lib/utils";

interface CartSummaryProps {
  subtotal: number;
  shippingCost?: number;
  tax?: number;
  total?: number;
  showDetails?: boolean;
}

export function CartSummary({
  subtotal,
  shippingCost = 0,
  tax = 0,
  total,
  showDetails = true,
}: CartSummaryProps) {
  const calculatedTotal = total ?? subtotal + shippingCost + tax;

  return (
    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Order Summary</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">{formatPrice(subtotal)}</span>
        </div>

        {showDetails && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="text-gray-900">
                {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatPrice(tax)}</span>
            </div>
          </>
        )}

        <div className="pt-2 mt-2 border-t border-gray-200">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(calculatedTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
