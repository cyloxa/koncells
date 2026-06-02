"use server";

import { prisma } from "@/lib/prisma";
import { productSchema } from "@/types";
import { revalidatePath } from "next/cache";
import type { ProductInput } from "@/types";

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

export async function getAllProducts() {
  return prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { position: "asc" } },
      relatedTo: { select: { relatedProductId: true } },
      relatedFrom: { select: { productId: true } },
      _count: { select: { reviews: true } },
    },
  });
  return product;
}

export async function searchProductsForOrder(query: string) {
  const select = {
    id: true,
    name: true,
    brand: true,
    model: true,
    price: true,
    buyingPrice: true,
    shippingCost: true,
    handlerCost: true,
    images: { orderBy: { position: "asc" }, take: 1 },
  } as const;

  const results = !query.trim()
    ? await prisma.product.findMany({
        where: { isActive: true },
        select,
        orderBy: { name: "asc" },
        take: 20,
      })
    : await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { brand: { contains: query, mode: "insensitive" } },
            { model: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
          ],
        },
        select,
        orderBy: { name: "asc" },
        take: 20,
      });

  // Convert Decimal to number for client component serialization
  return results.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    model: p.model,
    price: Number(p.price),
    buyingPrice: Number(p.buyingPrice),
    shippingCost: Number(p.shippingCost),
    handlerCost: Number(p.handlerCost),
    images: p.images,
  }));
}

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export async function createProduct(
  input: ProductInput
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(", ") };
  }

  const { images, relatedProductIds, ...productData } = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        ...productData,
        images: {
          create: images.map((img) => ({
            url: img.url,
            alt: img.alt ?? null,
            title: (img as any).title ?? null,
            position: img.position,
          })),
        },
        relatedTo: relatedProductIds.length > 0
          ? {
              create: relatedProductIds.map((relatedProductId) => ({
                relatedProductId,
              })),
            }
          : undefined,
      },
      select: { id: true, name: true },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { success: true, data: product };
  } catch (e: unknown) {
    const error = e as { code?: string; meta?: { target?: string[] } };
    if (error.code === "P2002") {
      const target = error.meta?.target?.join(", ") ?? "field";
      return { success: false, error: `A product with this ${target} already exists.` };
    }
    // eslint-disable-next-line no-console
    console.error("Create product error:", error);
    return { success: false, error: `Failed to create product: ${(e as Error).message}` };
  }
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = productSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(", ") };
  }

  const { images, relatedProductIds, ...productData } = parsed.data;

  try {
    const product = await prisma.$transaction(async (tx) => {
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img) => ({
              url: img.url,
              alt: img.alt ?? null,
              title: (img as any).title ?? null,
              position: img.position,
              productId: id,
            })),
          });
        }
      }

      if (relatedProductIds !== undefined) {
        await tx.relatedProduct.deleteMany({
          where: {
            OR: [{ productId: id }, { relatedProductId: id }],
          },
        });
        if (relatedProductIds.length > 0) {
          await tx.relatedProduct.createMany({
            data: relatedProductIds.map((relatedProductId) => ({
              productId: id,
              relatedProductId,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: productData,
        select: { id: true, name: true, slug: true },
      });
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/products/${product.slug}`);
    return { success: true, data: product };
  } catch (e: unknown) {
    const error = e as { code?: string; meta?: { target?: string[] } };
    if (error.code === "P2002") {
      const target = error.meta?.target?.join(", ") ?? "field";
      return { success: false, error: `A product with this ${target} already exists.` };
    }
    if (error.code === "P2025") {
      return { success: false, error: "Product not found." };
    }
    // eslint-disable-next-line no-console
    console.error("Update product error:", error);
    return { success: false, error: `Failed to update product: ${(e as Error).message}` };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/products");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete product." };
  }
}
