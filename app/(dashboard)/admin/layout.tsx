import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  BarChart3,
  Settings,
  ClipboardList,
  Warehouse,
  Clock,
  Truck,
} from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/products", label: "Products", icon: <Package className="h-4 w-4" /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
  { href: "/admin/purchase-orders", label: "Purchase Orders", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/admin/warehouse", label: "Warehouse", icon: <Warehouse className="h-4 w-4" /> },
  { href: "/admin/suppliers", label: "Suppliers", icon: <Truck className="h-4 w-4" /> },
  { href: "/admin/pre-orders", label: "Pre-Orders", icon: <Clock className="h-4 w-4" /> },
  { href: "/admin/customers", label: "Customers", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/categories", label: "Categories", icon: <FolderTree className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
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
