"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

interface NavCategory {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

export function Providers({
  children,
  categories,
}: {
  children: React.ReactNode;
  categories: NavCategory[];
}) {
  return (
    <SessionProvider>
      <Navbar categories={categories} />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer categories={categories} />
      <CartDrawer />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#f9fafb",
            borderRadius: "8px",
          },
        }}
      />
    </SessionProvider>
  );
}
