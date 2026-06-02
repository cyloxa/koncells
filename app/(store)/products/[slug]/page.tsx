import { notFound } from "next/navigation";
import { getProductBySlug } from "@/actions/product.actions";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { Price } from "@/components/common/Price";
import { Breadcrumb } from "@/components/common/Breadcrumb";
import { AddToCartButton } from "./AddToCartButton";
import { Star, StarHalf } from "lucide-react";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product Not Found" };

  const siteName = "Koncells";
  const metaTitle = product.metaTitle
    ? `${product.metaTitle} | ${siteName}`
    : `${product.name} | ${siteName}`;
  const metaDescription =
    product.metaDescription ||
    product.description.slice(0, 160).replace(/\n/g, " ").trim();
  const ogImageUrl = product.ogImage || product.images[0]?.url || "";

  return {
    title: metaTitle,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: "website",
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                alt: product.name,
                width: 1200,
                height: 630,
              },
            ],
          }
        : {}),
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const avgRating = "avgRating" in product ? (product as any).avgRating : 0;
  const reviewCount = "reviewCount" in product ? (product as any).reviewCount : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: "Products", href: "/products" },
          ...(product.category
            ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }]
            : []),
          { label: product.name },
        ]}
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <ProductImageGallery images={product.images} productName={product.name} />

        {/* Details */}
        <div>
          {product.category && (
            <p className="text-sm font-medium text-brand mb-2">
              {product.category.name}
            </p>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>

          {/* Rating */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => {
                  const diff = avgRating - i;
                  if (diff >= 1) return <Star key={i} className="h-4 w-4 fill-current" />;
                  if (diff >= 0.5) return <StarHalf key={i} className="h-4 w-4 fill-current" />;
                  return <Star key={i} className="h-4 w-4 text-gray-200" />;
                })}
              </div>
              <span className="text-sm text-gray-600">
                {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mt-6">
            {product.showPrice && (
              <Price
                price={Number(product.price)}
                compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : null}
                size="lg"
              />
            )}
            {!product.showPrice && (
              <span className="text-lg font-semibold text-gray-900">
                Contact for price
              </span>
            )}
          </div>

          {/* Stock info */}
          <p className="mt-4 text-sm">
            {product.stock > 0 ? (
              <span className="text-green-600 font-medium">
                ✓ {product.stock} in stock
              </span>
            ) : (
              <span className="text-red-600 font-medium">Out of stock</span>
            )}
          </p>

          {/* SKU */}
          <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>

          {/* Add to Cart */}
          <div className="mt-8">
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: Number(product.price),
                stock: product.stock,
                image: product.images[0]?.url ?? "",
              }}
            />
          </div>

          {/* Description */}
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <div className="text-gray-600 leading-relaxed space-y-4">
              {product.description.split("\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Brand / Model */}
          {(product.brand || product.model) && (
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {product.brand && (
                <div>
                  <span className="text-gray-500">Brand:</span>{" "}
                  <span className="font-medium text-gray-900">{product.brand}</span>
                </div>
              )}
              {product.model && (
                <div>
                  <span className="text-gray-500">Model:</span>{" "}
                  <span className="font-medium text-gray-900">{product.model}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Customer Reviews ({reviewCount})
        </h2>
        {product.reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet. Be the first to review this product.</p>
        ) : (
          <div className="space-y-6">
            {product.reviews.map((review) => (
              <div key={review.id} className="p-6 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  {review.user.image ? (
                    <img
                      src={review.user.image}
                      alt={review.user.name ?? "User"}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-brand-light flex items-center justify-center">
                      <span className="text-sm font-medium text-brand">
                        {review.user.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{review.user.name ?? "Anonymous"}</p>
                    <div className="flex text-yellow-400 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? "fill-current" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {review.title && (
                  <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                )}
                {review.comment && (
                  <p className="text-gray-600 text-sm">{review.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
