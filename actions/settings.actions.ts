"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { execSync } from "child_process";
import { writeFile, mkdir, readFile, unlink, readdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { existsSync } from "fs";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Brand Materials ───────────────────────────────────

export async function getBrandSettings() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  let settings = await prisma.brandSetting.findFirst();
  if (!settings) {
    settings = await prisma.brandSetting.create({ data: {} });
  }
  return settings;
}

const brandSettingsSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  phone: z.string().optional().nullable(),
  emails: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  iconUrl: z.string().optional().nullable(),
  verticalLogo: z.string().optional().nullable(),
  horizontalLogo: z.string().optional().nullable(),
});

export async function updateBrandSettings(
  input: z.infer<typeof brandSettingsSchema>
): Promise<ActionResult<{ brandName: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = brandSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    let settings = await prisma.brandSetting.findFirst();
    if (settings) {
      settings = await prisma.brandSetting.update({
        where: { id: settings.id },
        data: parsed.data,
      });
    } else {
      settings = await prisma.brandSetting.create({ data: parsed.data });
    }

    revalidatePath("/admin/settings");
    return { success: true, data: { brandName: settings.brandName } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update brand settings";
    return { success: false, error: message };
  }
}

// ─── Exchange Rates ────────────────────────────────────

export async function getExchangeRates() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  const rates = await prisma.exchangeRate.findMany({
    orderBy: { date: "desc" },
  });

  return rates.map((r) => ({
    ...r,
    rate: Number(r.rate),
  }));
}

const exchangeRateSchema = z.object({
  source: z.enum(["CNY", "USD"]),
  rate: z.coerce.number().positive("Rate must be positive"),
  isDefault: z.boolean().default(false),
});

export async function createExchangeRate(
  input: z.infer<typeof exchangeRateSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = exchangeRateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    // If this is set as default, unset all other defaults first
    if (parsed.data.isDefault) {
      await prisma.exchangeRate.updateMany({
        where: { source: parsed.data.source, isDefault: true },
        data: { isDefault: false },
      });
    }

    const rate = await prisma.exchangeRate.create({
      data: {
        source: parsed.data.source,
        target: "LKR",
        rate: parsed.data.rate,
        isDefault: parsed.data.isDefault,
      },
      select: { id: true },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { id: rate.id } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to create exchange rate";
    return { success: false, error: message };
  }
}

export async function setDefaultExchangeRate(
  id: string,
  source: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    // Unset all defaults for this source
    await prisma.exchangeRate.updateMany({
      where: { source, isDefault: true },
      data: { isDefault: false },
    });

    // Set the new default
    await prisma.exchangeRate.update({
      where: { id },
      data: { isDefault: true },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { id } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to set default exchange rate";
    return { success: false, error: message };
  }
}

export async function deleteExchangeRate(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    await prisma.exchangeRate.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete exchange rate" };
  }
}

export async function bulkDeleteExchangeRates(
  ids: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    const result = await prisma.exchangeRate.deleteMany({
      where: { id: { in: ids } },
    });
    revalidatePath("/admin/settings");
    return { success: true, data: { count: result.count } };
  } catch {
    return { success: false, error: "Failed to delete exchange rates" };
  }
}

// ─── Database Backup ───────────────────────────────────

const BACKUP_DIR = path.join(process.cwd(), "backups");

function getDbUrl(): { db: string; user: string; password: string; host: string; port: string } {
  const url = new URL(process.env.DATABASE_URL || "");
  return {
    db: url.pathname.replace(/^\//, ""),
    user: url.username,
    password: url.password,
    host: url.hostname,
    port: url.port || "5432",
  };
}

export async function getBackups() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  return prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// ─── SEO Settings ──────────────────────────────────────

export async function getSeoSettings() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Unauthorized");

  let settings = await prisma.seoSettings.findFirst();
  if (!settings) {
    settings = await prisma.seoSettings.create({ data: {} });
  }
  return settings;
}

const seoSettingsSchema = z.object({
  showInProductForm: z.boolean(),
});

export async function updateSeoSettings(
  input: z.infer<typeof seoSettingsSchema>
): Promise<ActionResult<{ showInProductForm: boolean }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const parsed = seoSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e: any) => e.message).join(", "),
    };
  }

  try {
    let settings = await prisma.seoSettings.findFirst();
    if (settings) {
      settings = await prisma.seoSettings.update({
        where: { id: settings.id },
        data: parsed.data,
      });
    } else {
      settings = await prisma.seoSettings.create({ data: parsed.data });
    }

    revalidatePath("/admin/settings");
    return { success: true, data: { showInProductForm: settings.showInProductForm } };
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to update SEO settings";
    return { success: false, error: message };
  }
}

export async function createBackup(): Promise<ActionResult<{ id: string; name: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    await mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup-${timestamp}`;
    const filename = `${backupName}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const { db, user, host, port } = getDbUrl();

    // Use pg_dump to create the backup
    execSync(
      `PGPASSWORD="${process.env.DATABASE_PASSWORD || ""}" pg_dump -h ${host} -p ${port} -U ${user} -d ${db} -F c -f "${filepath}"`,
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DATABASE_PASSWORD || "",
        },
        timeout: 120000,
      }
    );

    // Get file size
    const stats = await readFile(filepath);
    const size = stats.length;

    const backup = await prisma.backup.create({
      data: { name: backupName, filename, size },
      select: { id: true, name: true },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { id: backup.id, name: backup.name } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Backup failed";
    return { success: false, error: message };
  }
}

export async function downloadBackup(
  id: string
): Promise<ActionResult<{ filename: string; filepath: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return { success: false, error: "Backup not found" };

    const filepath = path.join(BACKUP_DIR, backup.filename);
    if (!existsSync(filepath))
      return { success: false, error: "Backup file not found on disk" };

    return { success: true, data: { filename: backup.filename, filepath } };
  } catch {
    return { success: false, error: "Failed to get backup file" };
  }
}

export async function restoreBackup(
  id: string
): Promise<ActionResult<{ name: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return { success: false, error: "Backup not found" };

    const filepath = path.join(BACKUP_DIR, backup.filename);
    if (!existsSync(filepath))
      return { success: false, error: "Backup file not found on disk" };

    const { db, user, host, port } = getDbUrl();

    execSync(
      `PGPASSWORD="${process.env.DATABASE_PASSWORD || ""}" pg_restore -h ${host} -p ${port} -U ${user} -d ${db} --clean --if-exists -c "${filepath}"`,
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DATABASE_PASSWORD || "",
        },
        timeout: 300000,
      }
    );

    revalidatePath("/admin/settings");
    return { success: true, data: { name: backup.name } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Restore failed";
    return { success: false, error: message };
  }
}

export async function deleteBackup(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return { success: false, error: "Backup not found" };

    const filepath = path.join(BACKUP_DIR, backup.filename);
    // Try to delete the file, but don't fail if it's already gone
    try {
      await unlink(filepath);
    } catch {}

    await prisma.backup.delete({ where: { id } });
    revalidatePath("/admin/settings");
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Failed to delete backup" };
  }
}

export async function bulkDeleteBackups(
  ids: string[]
): Promise<ActionResult<{ count: number }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  try {
    const backups = await prisma.backup.findMany({
      where: { id: { in: ids } },
      select: { id: true, filename: true },
    });

    // Delete files
    for (const backup of backups) {
      try {
        await unlink(path.join(BACKUP_DIR, backup.filename));
      } catch {}
    }

    const result = await prisma.backup.deleteMany({
      where: { id: { in: ids } },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { count: result.count } };
  } catch {
    return { success: false, error: "Failed to delete backups" };
  }
}

// ─── Image Processing Settings ─────────────────────────

export interface ImageSettingsData {
  id: string;
  resizeEnabled: boolean;
  resizeWidth: number;
  resizeHeight: number;
  resizeFit: string;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkSize: number;
  watermarkPosition: string;
  outputFormat: string;
  outputQuality: number;
}

export async function getImageSettings(): Promise<ImageSettingsData> {
  let settings = await prisma.imageSettings.findFirst();
  if (!settings) {
    settings = await prisma.imageSettings.create({
      data: {},
    });
  }
  return {
    id: settings.id,
    resizeEnabled: settings.resizeEnabled,
    resizeWidth: settings.resizeWidth,
    resizeHeight: settings.resizeHeight,
    resizeFit: settings.resizeFit,
    watermarkEnabled: settings.watermarkEnabled,
    watermarkText: settings.watermarkText,
    watermarkOpacity: settings.watermarkOpacity,
    watermarkSize: settings.watermarkSize,
    watermarkPosition: settings.watermarkPosition,
    outputFormat: settings.outputFormat,
    outputQuality: settings.outputQuality,
  };
}

const imageSettingsSchema = z.object({
  resizeEnabled: z.coerce.boolean(),
  resizeWidth: z.coerce.number().int().min(100).max(5000),
  resizeHeight: z.coerce.number().int().min(100).max(5000),
  resizeFit: z.enum(["inside", "cover", "contain", "fill", "outside"]),
  watermarkEnabled: z.coerce.boolean(),
  watermarkText: z.string(),
  watermarkOpacity: z.coerce.number().min(0).max(1),
  watermarkSize: z.coerce.number().int().min(16).max(200),
  watermarkPosition: z.enum(["southeast", "southwest", "northeast", "northwest"]),
  outputFormat: z.enum(["webp", "jpeg"]),
  outputQuality: z.coerce.number().int().min(1).max(100),
});

export async function updateImageSettings(
  input: z.infer<typeof imageSettingsSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }
  const parsed = imageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((e: any) => e.message).join(", ") };
  }
  try {
    const existing = await prisma.imageSettings.findFirst();
    if (existing) {
      await prisma.imageSettings.update({ where: { id: existing.id }, data: parsed.data });
    } else {
      await prisma.imageSettings.create({ data: parsed.data });
    }
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update image settings" };
  }
}
