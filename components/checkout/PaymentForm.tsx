"use client";

import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock } from "lucide-react";

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PaymentForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (error) {
      onError(error.message ?? "Payment failed");
      setIsProcessing(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess();
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#374151",
        "::placeholder": { color: "#9CA3AF" },
      },
      invalid: { color: "#EF4444" },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-gray-300 p-4 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
        <CardElement options={cardElementOptions} />
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Lock className="h-3 w-3" />
        <span>Payments are secure and encrypted</span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isProcessing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
}
