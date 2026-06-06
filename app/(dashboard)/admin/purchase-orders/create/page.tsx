import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateOrderClient } from "./CreateOrderClient";

export default async function CreatePurchaseOrderPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [products, suppliers, exchangeRates] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, price: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      select: { id: true, name: true, contact: true },
      orderBy: { name: "asc" },
    }),
    prisma.exchangeRate.findMany({
      where: { source: "CNY", target: "LKR" },
      select: { id: true, rate: true, isDefault: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const defaultRate = exchangeRates.find((r) => r.isDefault) ?? exchangeRates[0];

  return (
    <CreateOrderClient
      products={products.map((p) => ({
        ...p,
        price: Number(p.price),
      }))}
      suppliers={suppliers}
      defaultExchangeRate={defaultRate ? Number(defaultRate.rate) : null}
    />
  );
}
