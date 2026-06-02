"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify } from "@/lib/utils";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getBrands() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getAllBrandsForSelect() {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
});

export async function createBrand(
  input: z.infer<typeof brandSchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    const slug = slugify(parsed.data.name);
    const brand = await prisma.brand.create({
      data: { name: parsed.data.name, slug },
      select: { id: true, name: true },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: brand };
  } catch (e: unknown) {
    const error = e as { code?: string };
    if (error.code === "P2002") {
      return { success: false, error: "This brand name already exists." };
    }
    return { success: false, error: "Failed to create brand." };
  }
}

export async function updateBrand(
  id: string,
  input: z.infer<typeof brandSchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    const slug = slugify(parsed.data.name);
    const brand = await prisma.brand.update({
      where: { id },
      data: { name: parsed.data.name, slug },
      select: { id: true, name: true },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: brand };
  } catch (e: unknown) {
    const error = e as { code?: string };
    if (error.code === "P2002") {
      return { success: false, error: "This brand name already exists." };
    }
    return { success: false, error: "Failed to update brand." };
  }
}

export async function deleteBrand(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    await prisma.brand.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete brand." };
  }
}

export async function bulkDeleteBrands(
  ids: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    const result = await prisma.brand.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/admin/settings");
    return { success: true, data: { count: result.count } };
  } catch {
    return { success: false, error: "Failed to delete brands." };
  }
}

export async function importBrandsFromCSV(
  csvText: string
): Promise<ActionResult<{ created: number; skipped: string[] }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    // Split by newlines, then by commas, trim whitespace, filter empty
    const lines = csvText.split("\n").filter((line) => line.trim());
    const names = new Set<string>();
    const skipped: string[] = [];

    for (const line of lines) {
      // Support "name" or "name,slug" format — take the first column as name
      const name = line.split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (name) {
        names.add(name);
      }
    }

    let created = 0;
    for (const name of names) {
      const slug = slugify(name);
      try {
        await prisma.brand.create({ data: { name, slug } });
        created++;
      } catch (e: unknown) {
        const error = e as { code?: string };
        if (error.code === "P2002") {
          skipped.push(name);
        }
      }
    }

    revalidatePath("/admin/settings");
    return { success: true, data: { created, skipped } };
  } catch {
    return { success: false, error: "Failed to import brands from CSV." };
  }
}
