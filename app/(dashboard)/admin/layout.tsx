import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/products", label: "Products", icon: <Package className="h-4 w-4" /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar items={adminLinks} title="Admin Panel" />
      <div className="flex-1 bg-gray-50">{children}</div>
    </div>
  );
}
