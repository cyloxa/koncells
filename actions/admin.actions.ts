"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ─── Users ─────────────────────────────────────────────

export async function getUsers() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.user.findMany({
    include: {
      _count: { select: { orders: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["USER", "ADMIN"]),
});

export async function updateUserRole(
  input: z.infer<typeof updateUserRoleSchema>
): Promise<ActionResult<{ id: string; name: string | null; role: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
      select: { id: true, name: true, role: true },
    });
    revalidatePath("/admin/customers");
    return { success: true, data: user };
  } catch {
    return { success: false, error: "Failed to update user role." };
  }
}

// ─── Categories ────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  image: z.string().optional(),
});

export async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
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
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${productCount} product(s). Move or delete products first.`,
      };
    }
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/categories");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete category." };
  }
}
