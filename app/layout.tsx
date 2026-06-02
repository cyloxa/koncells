import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/common/Providers";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
