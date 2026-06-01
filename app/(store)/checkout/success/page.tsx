import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package } from "lucide-react";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="flex justify-center mb-6">
        <div className="p-4 rounded-full bg-green-100">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
      <p className="text-gray-600 mt-4 text-lg">
        Thank you for your purchase. Your order has been received and is being processed.
      </p>

      {orderId && (
        <div className="mt-6 p-4 rounded-xl bg-gray-50 inline-block">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Package className="h-4 w-4" />
            Order ID: <span className="font-mono font-medium">{orderId}</span>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 mt-4">
        A confirmation email will be sent to your email address shortly.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/products">
          <Button size="lg">Continue Shopping</Button>
        </Link>
        {orderId && (
          <Link href={`/orders/${orderId}`}>
            <Button variant="outline" size="lg">
              View Order
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
