import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { BRAND } from "@/lib/brand";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // SEO-friendly filename: use provided name or fall back to random
    const seoName = formData.get("seoName") as string | null;
    const position = formData.get("position") as string | null;
    const baseName = seoName
      ? `${seoName}${position ? `-${position}` : ""}`
      : crypto.randomUUID();
    const isSvg = file.type === "image/svg+xml";
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const uploadDirResized = path.join(process.cwd(), "public", "uploads", "resized");

    // Load image settings from DB
    let settings = await prisma.imageSettings.findFirst();
    if (!settings) {
      settings = await prisma.imageSettings.create({ data: {} });
    }

    if (isSvg) {
      // Save SVG as-is (no sharp processing, no watermark)
      await mkdir(uploadDir, { recursive: true });
      const filename = `${baseName}.svg`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({ url: publicUrl });
    }

    // Determine output extension
    const ext = settings.outputFormat === "jpeg" ? ".jpg" : ".webp";
    const filename = `${baseName}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Build sharp pipeline
    let pipeline = sharp(buffer);

    // Resize (only if enabled)
    if (settings.resizeEnabled) {
      const resizeFit = settings.resizeFit as keyof sharp.FitEnum | undefined;
      pipeline = pipeline.resize(settings.resizeWidth, settings.resizeHeight, {
        fit: resizeFit || "inside",
        withoutEnlargement: true,
      });
    }

    // Watermark
    if (settings.watermarkEnabled && settings.watermarkText) {
      const metadata = await sharp(buffer).metadata();
      const imgWidth = metadata.width ?? settings.resizeWidth;
      const barWidth = Math.min(400, Math.round(imgWidth * 0.5));
      const barHeight = settings.watermarkSize;
      const fontSize = Math.max(14, Math.round(barWidth / 22));
      const opacity = Math.max(0, Math.min(1, settings.watermarkOpacity));
      const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, "0");

      const watermarkSvg = Buffer.from(
        `<svg width="${barWidth}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${barWidth}" height="${barHeight}" fill="rgba(0,0,0,${opacity})" rx="6" />
          <text
            x="${barWidth - 12}"
            y="${barHeight - 14}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${fontSize}"
            fill="white${alphaHex}"
            text-anchor="end"
            font-weight="bold"
          >${escapeXml(settings.watermarkText)}</text>
        </svg>`
      );

      const gravityMap: Record<string, string> = {
        southeast: "southeast",
        southwest: "southwest",
        northeast: "northeast",
        northwest: "northwest",
      };
      pipeline = pipeline.composite([
        {
          input: watermarkSvg,
          gravity: (gravityMap[settings.watermarkPosition] || "southeast") as any,
        },
      ]);
    }

    // Output
    if (settings.outputFormat === "jpeg") {
      pipeline = pipeline.jpeg({ quality: settings.outputQuality });
    } else {
      pipeline = pipeline.webp({ quality: settings.outputQuality });
    }

    await pipeline.toFile(filepath);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
