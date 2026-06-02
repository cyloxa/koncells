"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema, type ProfileInput } from "@/types";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      socialLinks: true,
      additionalNotes: true,
      image: true,
      createdAt: true,
    },
  });

  return user;
}

export async function updateProfile(
  input: ProfileInput
): Promise<ActionResult<{ name: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        location: parsed.data.location || null,
        socialLinks: parsed.data.socialLinks || null,
        additionalNotes: parsed.data.additionalNotes || null,
      },
      select: { name: true },
    });

    revalidatePath("/profile");
    return { success: true, data: user };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update profile";
    return { success: false, error: message };
  }
}
