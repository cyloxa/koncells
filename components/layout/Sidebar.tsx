"use client";

import Link from "next/link";
import { useUIStore } from "@/store/uiStore";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface SidebarProps {
  items: {
    href: string;
    label: string;
    icon?: React.ReactNode;
  }[];
  title?: string;
}

export function Sidebar({ items, title = "Menu" }: Readonly<SidebarProps>) {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();

  return (
    <>
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                    pathname === item.href
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
