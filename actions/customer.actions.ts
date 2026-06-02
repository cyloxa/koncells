"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Schema ─────────────────────────────────────────────

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  socialLinks: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .nullable(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// ─── Search ─────────────────────────────────────────────

export async function searchCustomers(query: string) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  if (!query.trim()) {
    return prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        socialLinks: true,
        additionalNotes: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      socialLinks: true,
      additionalNotes: true,
      createdAt: true,
      _count: { select: { orders: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── List ───────────────────────────────────────────────

export async function getCustomers() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.user.findMany({
    where: { role: "USER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      socialLinks: true,
      additionalNotes: true,
      createdAt: true,
      _count: { select: { orders: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Create ─────────────────────────────────────────────

export async function createCustomer(
  input: CustomerInput
): Promise<ActionResult<{ id: string; name: string | null }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  const { password, ...rest } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: rest.email },
  });
  if (existing) {
    return { success: false, error: "A customer with this email already exists" };
  }

  try {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword,
        role: "USER",
      },
      select: { id: true, name: true },
    });

    revalidatePath("/admin/customers");
    return { success: true, data: user };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to create customer";
    return { success: false, error: message };
  }
}

// ─── Update ─────────────────────────────────────────────

const updateCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  socialLinks: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable(),
});

export async function updateCustomer(
  id: string,
  input: z.infer<typeof updateCustomerSchema>
): Promise<ActionResult<{ id: string; name: string | null }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true },
    });

    revalidatePath("/admin/customers");
    return { success: true, data: user };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update customer";
    return { success: false, error: message };
  }
}

// ─── Bulk Delete ────────────────────────────────────────

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "Select at least one customer"),
});

export async function bulkDeleteCustomers(
  ids: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = bulkDeleteSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, error: "Invalid selection" };
  }

  try {
    const result = await prisma.user.deleteMany({
      where: { id: { in: parsed.data.ids }, role: "USER" },
    });

    revalidatePath("/admin/customers");
    return { success: true, data: { count: result.count } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to delete customers";
    return { success: false, error: message };
  }
}
