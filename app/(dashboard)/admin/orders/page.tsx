import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminOrdersTable from "./AdminOrdersTable";

function buildOrderName(createdAt: Date, seq: number): string {
  const d = new Date(createdAt);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `KONCELLS${dd}${mm}${yy}#${seq}`;
}

function computeCostsProfit(
  items: {
    quantity: number;
    price: { toNumber: () => number } | number;
    costs: { toNumber: () => number } | number | null;
    discount: { toNumber: () => number } | number | null;
    product: {
      shippingCost: { toNumber: () => number } | number | null;
      handlerCost: { toNumber: () => number } | number | null;
    };
  }[]
) {
  let totalCosts = 0;
  let totalProfit = 0;

  for (const item of items) {
    const qty = item.quantity;
    const price = Number(item.price);
    const baseCost = item.costs ? Number(item.costs) : 0;
    const shipping = Number(item.product.shippingCost ?? 0);
    const handler = Number(item.product.handlerCost ?? 0);
    const discount = item.discount ? Number(item.discount) : 0;

    const itemCost = (baseCost + shipping + handler) * qty;
    const itemRevenue = price * qty - discount * qty;

    totalCosts += itemCost;
    totalProfit += itemRevenue - itemCost;
  }

  return { totalCosts, totalProfit };
}

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, shippingCost: true, handlerCost: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Build sequential numbering per date
  const dateCounts: Record<string, number> = {};
  for (let i = orders.length - 1; i >= 0; i--) {
    const order = orders[i];
    const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
    dateCounts[dateKey] = (dateCounts[dateKey] ?? 0) + 1;
  }

  // Assign sequential numbers in chronological order (oldest first)
  const seqMap: Record<string, number> = {};
  const currentCounts: Record<string, number> = {};
  for (let i = orders.length - 1; i >= 0; i--) {
    const order = orders[i];
    const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
    currentCounts[dateKey] = (currentCounts[dateKey] ?? 0) + 1;
    seqMap[order.id] = currentCounts[dateKey];
  }

  const rows = orders.map((order) => {
    const { totalCosts, totalProfit } = computeCostsProfit(order.items);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderName: buildOrderName(order.createdAt, seqMap[order.id]),
      createdAt: order.createdAt,
      customerName: order.user.name,
      customerEmail: order.user.email,
      status: order.status,
      total: Number(order.total),
      totalCosts,
      totalProfit,
      itemCount: order.items.length,
    };
  });

  return <AdminOrdersTable initialOrders={rows} />;
}
