import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Truck, RefreshCw } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getProducts } from "@/actions/product.actions";

export default async function HomePage() {
  const { products: featuredProducts } = await getProducts({
    featured: true,
    limit: 4,
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Premium Products for Modern Living
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/90 leading-relaxed">
              Discover our curated collection of electronics, fashion, and home goods.
              Fast shipping, easy returns, and exceptional quality.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/products">
                <Button
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-gray-100"
                >
                  Shop All Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/categories/electronics">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-indigo-100">
                <Truck className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Free Shipping</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Free shipping on all orders over $100. Fast and reliable delivery worldwide.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure Payments</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your payment information is always protected with industry-standard encryption.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <RefreshCw className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Easy Returns</h3>
                <p className="text-sm text-gray-600 mt-1">
                  30-day hassle-free returns. Not satisfied? Send it back, no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Featured Products
              </h2>
              <p className="text-gray-600 mt-1">
                Hand-picked favorites just for you
              </p>
            </div>
            <Link
              href="/products?featured=true"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View All
              <ArrowRight className="inline ml-1 h-4 w-4" />
            </Link>
          </div>
          <ProductGrid products={featuredProducts} />
        </section>
      )}

      {/* Category Showcase */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12">
            Shop by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Electronics",
                slug: "electronics",
                image:
                  "https://images.unsplash.com/photo-1498049794561-7780e723166d?w=600",
                description: "Gadgets, audio, and smart devices",
              },
              {
                name: "Clothing",
                slug: "clothing",
                image:
                  "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600",
                description: "Modern apparel for every occasion",
              },
              {
                name: "Home & Living",
                slug: "home-living",
                image:
                  "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600",
                description: "Furnishings and decor for your space",
              },
            ].map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3]"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white">{category.name}</h3>
                  <p className="text-sm text-white/80 mt-1">{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to upgrade your lifestyle?</h2>
          <p className="mt-4 text-lg text-indigo-100 max-w-2xl mx-auto">
            Join thousands of happy customers who trust CYLOXA for their shopping needs.
          </p>
          <Link href="/products" className="mt-8 inline-block">
            <Button
              size="lg"
              className="bg-white text-indigo-600 hover:bg-gray-100"
            >
              Start Shopping Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
