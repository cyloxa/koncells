"use server";

import { prisma } from "@/lib/prisma";
import { productSchema } from "@/types";
import { revalidatePath } from "next/cache";

export async function getProducts(params?: {
  category?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}) {
  const { category, search, featured, page = 1, limit = 12, sort } = params ?? {};

  const where: any = { isActive: true };

  if (category) {
    where.category = { slug: category };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (featured) {
    where.isFeatured = true;
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "price-asc") orderBy = { price: "asc" };
  else if (sort === "price-desc") orderBy = { price: "desc" };
  else if (sort === "name") orderBy = { name: "asc" };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { position: "asc" } },
        _count: { select: { reviews: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { position: "asc" } },
      reviews: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) return null;

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

  return { ...product, avgRating, reviewCount: product.reviews.length };
}

export async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(data: FormData) {
  const raw = Object.fromEntries(data.entries());
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.message);

  const product = await prisma.product.create({
    data: parsed.data,
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return product;
}

export async function updateProduct(id: string, data: FormData) {
  const raw = Object.fromEntries(data.entries());
  const parsed = productSchema.partial().safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.message);

  const product = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/admin/products");
  revalidatePath(`/products/${product.slug}`);
  return product;
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/products");
}
