"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Navbar />
      <main className="min-h-screen pt-16">{children}</main>
      <Footer />
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
