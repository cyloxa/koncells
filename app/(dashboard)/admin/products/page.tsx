import { prisma } from "@/lib/prisma";
import { getDefaultExchangeRates } from "@/actions/exchange.actions";
import AdminProductsPage from "./AdminProductsTable";

export default async function ProductsPageWrapper() {
  const [products, rates] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" }, select: { url: true, alt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getDefaultExchangeRates(),
  ]);

  const initialProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brand: p.brand,
    model: p.model,
    description: p.description,
    metaDescription: p.metaDescription ?? "",
    images: p.images.map((img) => ({ url: img.url, alt: img.alt })),
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    globalPrice: p.globalPrice ? Number(p.globalPrice) : null,
    buyingPrice: p.buyingPrice ? Number(p.buyingPrice) : null,
    competitorsPrice: p.competitorsPrice ? Number(p.competitorsPrice) : null,
    shippingCost: p.shippingCost ? Number(p.shippingCost) : null,
    handlerCost: p.handlerCost ? Number(p.handlerCost) : null,
    stock: p.stock,
    isActive: p.isActive,
    categoryName: p.category?.name ?? null,
  }));

  return <AdminProductsPage initialProducts={initialProducts} usdToLkr={rates.usdToLkr} cnyToLkr={rates.cnyToLkr} />;
}
