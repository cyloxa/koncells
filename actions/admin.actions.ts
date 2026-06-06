"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { escapeCsvField, parseCsvLine } from "@/lib/csv";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ─── Categories ────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional().nullable(),
});

export async function getCategories() {
  return prisma.category.findMany({
    include: {
      _count: { select: { products: true, children: true } },
      parent: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}

export async function createCategory(
  input: z.infer<typeof categorySchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(", ") };
  }

  try {
    const category = await prisma.category.create({
      data: parsed.data,
      select: { id: true, name: true },
    });
    revalidatePath("/admin/categories");
    return { success: true, data: category };
  } catch (e: unknown) {
    const error = e as { code?: string };
    if (error.code === "P2002") {
      return { success: false, error: "A category with this name or slug already exists." };
    }
    return { success: false, error: "Failed to create category." };
  }
}

export async function updateCategory(
  id: string,
  input: Partial<z.infer<typeof categorySchema>>
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = categorySchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(", ") };
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true },
    });
    revalidatePath("/admin/categories");
    return { success: true, data: category };
  } catch (e: unknown) {
    const error = e as { code?: string };
    if (error.code === "P2002") {
      return { success: false, error: "A category with this name or slug already exists." };
    }
    return { success: false, error: "Failed to update category." };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) return { success: false, error: "Category not found." };

    if (category._count.children > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${category._count.children} subcategor${category._count.children !== 1 ? "ies" : "y"}. Delete subcategories first.`,
      };
    }

    if (category._count.products > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${category._count.products} product(s). Move or delete products first.`,
      };
    }

    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/categories");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete category." };
  }
}

export async function bulkDeleteCategories(
  ids: string[]
): Promise<ActionResult<{ deletedCount: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = z.array(z.string().uuid()).safeParse(ids);
  if (!parsed.success) return { success: false, error: "Invalid category IDs" };

  try {
    // Check for categories with children
    const categoriesWithChildren = await prisma.category.findMany({
      where: { id: { in: parsed.data }, children: { some: {} } },
      select: { id: true, name: true },
    });

    if (categoriesWithChildren.length > 0) {
      return {
        success: false,
        error: `Cannot delete categories with subcategories: ${categoriesWithChildren.map((c) => c.name).join(", ")}. Delete subcategories first.`,
      };
    }

    const categoriesWithProducts = await prisma.category.findMany({
      where: { id: { in: parsed.data }, products: { some: {} } },
      select: { id: true, name: true },
    });

    if (categoriesWithProducts.length > 0) {
      return {
        success: false,
        error: `Cannot delete categories with products: ${categoriesWithProducts.map((c) => c.name).join(", ")}. Move or delete products first.`,
      };
    }

    const result = await prisma.category.deleteMany({
      where: { id: { in: parsed.data } },
    });

    revalidatePath("/admin/categories");
    return { success: true, data: { deletedCount: result.count } };
  } catch {
    return { success: false, error: "Failed to delete categories." };
  }
}

export async function exportCategoriesCsv(): Promise<ActionResult<string>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        description: true,
        image: true,
        parent: { select: { slug: true } },
      },
    });

    const header = "name,slug,description,image,parentSlug";
    const rows = categories.map(
      (c) =>
        `${escapeCsvField(c.name)},${escapeCsvField(c.slug)},${escapeCsvField(c.description ?? "")},${escapeCsvField(c.image ?? "")},${escapeCsvField(c.parent?.slug ?? "")}`
    );

    return { success: true, data: [header, ...rows].join("\n") };
  } catch {
    return { success: false, error: "Failed to export categories." };
  }
}

const importCsvSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().default(""),
  image: z.string().optional().default(""),
  parentSlug: z.string().optional().default(""),
});

export async function importCategoriesCsv(
  csvContent: string
): Promise<ActionResult<{ created: number; skipped: number; errors: string[] }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  try {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      return { success: false, error: "CSV must have a header row and at least one data row." };
    }

    // Validate header
    const header = parseCsvLine(lines[0]);
    const expectedHeader = ["name", "slug", "description", "image", "parentSlug"];
    if (header.length !== expectedHeader.length || !header.every((h, i) => h.toLowerCase() === expectedHeader[i])) {
      return { success: false, error: `CSV header must be: ${expectedHeader.join(",")}` };
    }

    const dataLines = lines.slice(1).filter((l) => l.trim());
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const fields = parseCsvLine(dataLines[i]);
      if (fields.length < 2) {
        errors.push(`Row ${i + 2}: invalid number of fields`);
        skipped++;
        continue;
      }

      const parsed = importCsvSchema.safeParse({
        name: fields[0]?.trim(),
        slug: fields[1]?.trim(),
        description: fields[2]?.trim() || "",
        image: fields[3]?.trim() || "",
        parentSlug: fields[4]?.trim() || "",
      });

      if (!parsed.success) {
        errors.push(`Row ${i + 2} ("${fields[0]}"): ${parsed.error.issues.map((e) => e.message).join(", ")}`);
        skipped++;
        continue;
      }

      // Resolve parentId from parentSlug if provided
      let parentId: string | null | undefined = undefined;
      if (parsed.data.parentSlug) {
        const parent = await prisma.category.findUnique({
          where: { slug: parsed.data.parentSlug },
          select: { id: true },
        });
        if (!parent) {
          errors.push(`Row ${i + 2} ("${parsed.data.name}"): parent category "${parsed.data.parentSlug}" not found`);
          skipped++;
          continue;
        }
        parentId = parent.id;
      }

      try {

        await prisma.category.upsert({
          where: { slug: parsed.data.slug },
          update: {
            name: parsed.data.name,
            description: parsed.data.description || null,
            image: parsed.data.image || null,
            parentId: parentId ?? null,
          },
          create: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description || null,
            image: parsed.data.image || null,
            parentId: parentId ?? null,
          },
        });
        created++;
      } catch (e: unknown) {
        const error = e as { code?: string };
        if (error.code === "P2002") {
          try {
            const updateData: any = {
              slug: parsed.data.slug,
              description: parsed.data.description || null,
              image: parsed.data.image || null,
            };
            if (parsed.data.parentSlug) {
              updateData.parentId = parentId ?? null;
            }
            await prisma.category.update({
              where: { name: parsed.data.name },
              data: updateData,
            });
            created++;
          } catch {
            errors.push(`Row ${i + 2} ("${parsed.data.name}"): duplicate name/slug`);
            skipped++;
          }
        } else {
          errors.push(`Row ${i + 2} ("${parsed.data.name}"): database error`);
          skipped++;
        }
      }
    }

    revalidatePath("/admin/categories");
    return { success: true, data: { created, skipped, errors } };
  } catch {
    return { success: false, error: "Failed to import categories." };
  }
}

