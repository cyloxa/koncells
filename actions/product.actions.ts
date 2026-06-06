"use server";

import { prisma } from "@/lib/prisma";
import { productSchema } from "@/types";
import { revalidatePath } from "next/cache";
import type { ProductInput } from "@/types";
import { escapeCsvField, parseCsvLine, validateCsvHeader } from "@/lib/csv";
import { uploadImageFromUrl } from "@/lib/upload";
import { auth } from "@/lib/auth";
import { getCategoryAndChildrenSlugs } from "@/lib/category";
import { z } from "zod";

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
    const slugs = await getCategoryAndChildrenSlugs(category);
    where.category = { slug: { in: slugs } };
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
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
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
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
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
            { description: { contains: query, mode: "insensitive" } },
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
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    revalidatePath("/admin/products");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete product." };
  }
}

// ─── CSV Export ─────────────────────────────────────────

const EXPORT_HEADER = [
  "name",
  "slug",
  "sku",
  "categorySlug",
  "description",
  "price",
  "buyingPrice",
  "globalPrice",
  "stock",
  "brand",
  "model",
  "condition",
  "weight",
  "compareAtPrice",
  "shippingCost",
  "handlerCost",
  "competitorsPrice",
  "isActive",
  "showPrice",
  "isFeatured",
  "tags",
  "metaTitle",
  "metaDescription",
  "focusKeyphrase",
  "image1",
  "image2",
  "image3",
  "image4",
  "image5",
];

export async function exportProductsCsv(): Promise<ActionResult<string>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { slug: true } },
        images: { orderBy: { position: "asc" }, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = products.map((p) => {
      const imageUrls = p.images.map((img) => img.url);
      const fields: Record<string, string> = {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categorySlug: p.category.slug,
        description: p.description,
        price: String(p.price),
        buyingPrice: p.buyingPrice ? String(p.buyingPrice) : "",
        globalPrice: p.globalPrice ? String(p.globalPrice) : "",
        stock: String(p.stock),
        brand: p.brand ?? "",
        model: p.model ?? "",
        condition: p.condition ?? "",
        weight: p.weight ? String(p.weight) : "",
        compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
        shippingCost: p.shippingCost ? String(p.shippingCost) : "",
        handlerCost: p.handlerCost ? String(p.handlerCost) : "",
        competitorsPrice: p.competitorsPrice ? String(p.competitorsPrice) : "",
        isActive: p.isActive ? "true" : "false",
        showPrice: p.showPrice ? "true" : "false",
        isFeatured: p.isFeatured ? "true" : "false",
        tags: p.tags ?? "",
        metaTitle: p.metaTitle ?? "",
        metaDescription: p.metaDescription ?? "",
        focusKeyphrase: p.focusKeyphrase ?? "",
        image1: imageUrls[0] ?? "",
        image2: imageUrls[1] ?? "",
        image3: imageUrls[2] ?? "",
        image4: imageUrls[3] ?? "",
        image5: imageUrls[4] ?? "",
      };
      return EXPORT_HEADER.map((h) => escapeCsvField(fields[h] ?? "")).join(",");
    });

    return { success: true, data: [EXPORT_HEADER.join(","), ...rows].join("\n") };
  } catch {
    return { success: false, error: "Failed to export products." };
  }
}

// ─── CSV Import ─────────────────────────────────────────

const importProductCsvSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  sku: z.string().min(1, "SKU is required"),
  categorySlug: z.string().min(1, "Category slug is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  buyingPrice: z.coerce.number().positive().optional().catch(undefined),
  globalPrice: z.coerce.number().positive().optional().catch(undefined),
  stock: z.coerce.number().int().min(0).default(0),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  condition: z.string().optional().default("New"),
  weight: z.coerce.number().positive().optional().catch(undefined),
  compareAtPrice: z.coerce.number().positive().optional().catch(undefined),
  shippingCost: z.coerce.number().min(0).optional().catch(undefined),
  handlerCost: z.coerce.number().min(0).optional().catch(undefined),
  competitorsPrice: z.coerce.number().positive().optional().catch(undefined),
  isActive: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  showPrice: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  isFeatured: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  tags: z.string().optional().default(""),
  metaTitle: z.string().optional().default(""),
  metaDescription: z.string().optional().default(""),
  focusKeyphrase: z.string().optional().default(""),
  image1: z.string().optional().default(""),
  image2: z.string().optional().default(""),
  image3: z.string().optional().default(""),
  image4: z.string().optional().default(""),
  image5: z.string().optional().default(""),
});

export async function importProductsCsv(
  csvContent: string,
  downloadImages: boolean = false
): Promise<
  ActionResult<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  }>
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      return { success: false, error: "CSV must have a header row and at least one data row." };
    }

    // Validate header
    if (!validateCsvHeader(lines[0], EXPORT_HEADER)) {
      return {
        success: false,
        error: `CSV header must be: ${EXPORT_HEADER.join(",")}`,
      };
    }

    const dataLines = lines.slice(1).filter((l) => l.trim());
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const fields = parseCsvLine(dataLines[i]);
      if (fields.length < EXPORT_HEADER.length) {
        errors.push(`Row ${i + 2}: insufficient fields (got ${fields.length}, expected ${EXPORT_HEADER.length})`);
        skipped++;
        continue;
      }

      const rowData: Record<string, string> = {};
      EXPORT_HEADER.forEach((h, idx) => {
        rowData[h] = fields[idx]?.trim() ?? "";
      });

      const parsed = importProductCsvSchema.safeParse(rowData);
      if (!parsed.success) {
        errors.push(
          `Row ${i + 2} ("${rowData.name || fields[0]}"): ${parsed.error.issues.map((e) => e.message).join(", ")}`
        );
        skipped++;
        continue;
      }

      const data = parsed.data;

      try {
        // Resolve category by slug
        let category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
        if (!category) {
          // Try to create a category with this slug
          const categoryName = data.categorySlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          try {
            category = await prisma.category.create({
              data: { name: categoryName, slug: data.categorySlug },
            });
          } catch {
            errors.push(`Row ${i + 2} ("${data.name}"): category "${data.categorySlug}" not found and could not be created`);
            skipped++;
            continue;
          }
        }

        // Handle image download if enabled
        const imageUrls = [data.image1, data.image2, data.image3, data.image4, data.image5].filter(Boolean);
        let uploadedImages: { url: string; position: number }[] = [];

        if (downloadImages && imageUrls.length > 0) {
          const uploadResults = await Promise.all(
            imageUrls.map((url, idx) =>
              uploadImageFromUrl(url, data.name, idx + 1).then((result) => ({
                url: result,
                position: idx + 1,
              }))
            )
          );
          uploadedImages = uploadResults.filter((r): r is { url: string; position: number } => r.url !== null);
        } else if (imageUrls.length > 0) {
          uploadedImages = imageUrls.map((url, idx) => ({
            url,
            position: idx + 1,
          }));
        }

        // Upsert product by SKU
        const existingProduct = await prisma.product.findUnique({ where: { sku: data.sku } });
        const productData = {
          name: data.name,
          slug: data.slug,
          description: data.description,
          brand: data.brand || null,
          model: data.model || null,
          condition: data.condition || null,
          tags: data.tags || null,
          weight: data.weight ?? null,
          price: data.price,
          compareAtPrice: data.compareAtPrice ?? null,
          globalPrice: data.globalPrice ?? null,
          buyingPrice: data.buyingPrice ?? null,
          competitorsPrice: data.competitorsPrice ?? null,
          shippingCost: data.shippingCost ?? null,
          handlerCost: data.handlerCost ?? null,
          stock: data.stock,
          isActive: data.isActive,
          showPrice: data.showPrice,
          isFeatured: data.isFeatured,
          categoryId: category.id,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          focusKeyphrase: data.focusKeyphrase || null,
        };

        if (existingProduct) {
          await prisma.$transaction(async (tx) => {
            await tx.product.update({
              where: { id: existingProduct.id },
              data: productData,
            });

            // Replace images
            if (uploadedImages.length > 0) {
              await tx.productImage.deleteMany({ where: { productId: existingProduct.id } });
              await tx.productImage.createMany({
                data: uploadedImages.map((img) => ({
                  url: img.url,
                  position: img.position,
                  productId: existingProduct.id,
                })),
              });
            }
          });
          updated++;
        } else {
          // Auto-generate slug if the provided one conflicts
          let slug = data.slug;
          const slugExists = await prisma.product.findUnique({ where: { slug } });
          if (slugExists) {
            slug = `${data.slug}-${Date.now()}`;
          }

          await prisma.product.create({
            data: {
              ...productData,
              slug,
              sku: data.sku,
              images: {
                create: uploadedImages.map((img) => ({
                  url: img.url,
                  position: img.position,
                })),
              },
            },
          });
          created++;
        }
      } catch (e: unknown) {
        const error = e as { code?: string; message?: string };
        if (error.code === "P2002") {
          errors.push(`Row ${i + 2} ("${data.name}"): duplicate unique field`);
        } else {
          errors.push(`Row ${i + 2} ("${data.name}"): ${error.message || "database error"}`);
        }
        skipped++;
      }
    }

    revalidatePath("/admin/products");
    return { success: true, data: { created, updated, skipped, errors } };
  } catch (e: unknown) {
    return { success: false, error: `Failed to import products: ${(e as Error).message}` };
  }
}
