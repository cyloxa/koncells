import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Price } from "@/components/common/Price";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      reviews: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      orderItems: {
        include: {
          order: { select: { id: true, createdAt: true, status: true } },
        },
      },
    },
  });

  if (!product) notFound();

  return (
    <div className="p-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
            {product.images[0] ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No image
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {product.images.slice(1).map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.alt ?? product.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-1">SKU: {product.sku}</p>

          <div className="mt-4">
            <Price
              price={Number(product.price)}
              compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : null}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">Stock</p>
              <p className="font-semibold">{product.stock}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">Category</p>
              <p className="font-semibold">{product.category.name}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">Featured</p>
              <p className="font-semibold">{product.isFeatured ? "Yes" : "No"}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold">{product.isActive ? "Active" : "Inactive"}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Reviews ({product.reviews.length})
        </h2>
        {product.reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">
                    {review.user.name ?? review.user.email}
                  </p>
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < review.rating ? "fill-current" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
