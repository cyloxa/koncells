import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Process a raw image buffer through sharp: resize, watermark, and format conversion.
 * Saves the result to public/uploads/ and returns the public URL.
 *
 * Shares the same logic as app/api/upload/route.ts but works with a raw buffer directly,
 * avoiding the multipart form requirement.
 */
export async function processAndSaveImage(
  buffer: Buffer,
  seoName: string,
  position?: number
): Promise<string | null> {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Load image settings from DB
    let settings = await prisma.imageSettings.findFirst();
    if (!settings) {
      settings = await prisma.imageSettings.create({ data: {} });
    }

    const ext = settings.outputFormat === "jpeg" ? ".jpg" : ".webp";
    const filename = `${seoName}${position !== undefined ? `-${position}` : ""}${ext}`;
    const filepath = path.join(uploadDir, filename);

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
      const alphaHex = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, "0");

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

    return `/uploads/${filename}`;
  } catch (error) {
    console.error("processAndSaveImage error:", error);
    return null;
  }
}

/**
 * Download an image from a URL, process it through sharp, and save to public/uploads/.
 * Returns the public URL or null on failure.
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  productName: string,
  position: number
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image from URL: ${imageUrl} (status ${response.status})`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.some((t) => contentType.includes(t))) {
      console.error(`Invalid content type for image URL: ${contentType}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Generate SEO filename from product name
    const seoName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    return await processAndSaveImage(buffer, seoName, position);
  } catch (error) {
    console.error(`uploadImageFromUrl error for ${imageUrl}:`, error);
    return null;
  }
}
