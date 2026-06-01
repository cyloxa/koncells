import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: { take: 1 } },
          },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) notFound();

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  const fmtUSD = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="p-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            statusColors[order.status]
          }`}
        >
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Items</h2>
            <div className="space-y-4">
              {order.items.map((item: { id: Key | null | undefined; product: { images: { url: string | Blob | undefined; }[]; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; slug: any; }; quantity: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; price: any; }) => (
                <div key={item.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.product.images[0] ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity} × {fmtUSD(Number(item.price))}
                    </p>
                  </div>
                  <p className="font-medium">
                    {fmtUSD(Number(item.price) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Customer</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-500">Name:</span>{" "}
                <span className="text-gray-900">{order.user.name ?? "—"}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-500">Email:</span>{" "}
                <span className="text-gray-900">{order.user.email}</span>
              </p>
            </div>
          </div>

          {/* Shipping address */}
          {order.shippingAddress && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <p className="text-sm text-gray-600">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`},
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{fmtUSD(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  {Number(order.shippingCost) === 0
                    ? "Free"
                    : fmtUSD(Number(order.shippingCost))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">{fmtUSD(Number(order.tax))}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">
                    {fmtUSD(Number(order.total))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
