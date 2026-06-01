"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/types";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

export async function loginAction(provider: string, formData?: FormData) {
  try {
    if (provider === "credentials" && formData) {
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      await signIn("credentials", { email, password, redirectTo: "/" });
    } else {
      await signIn(provider, { redirectTo: "/" });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: error.type === "CredentialsSignin" ? "Invalid credentials" : "Something went wrong" };
    }
    throw error;
  }
}

export async function registerAction(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  await signIn("credentials", { email, password, redirectTo: "/" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
