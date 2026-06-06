import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/common/Providers";
import { prisma } from "@/lib/prisma";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Koncells Store — Premium Products",
    template: "%s | Koncells Store",
  },
  description:
    "Discover premium electronics, clothing, and home goods at Koncells. Fast shipping, easy returns, and secure checkout.",
  keywords: ["ecommerce", "online store", "electronics", "clothing", "home decor"],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      slug: true,
      children: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers categories={categories}>{children}</Providers>
      </body>
    </html>
  );
}
