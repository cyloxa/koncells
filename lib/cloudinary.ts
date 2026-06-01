import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export async function uploadImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "ecommerce",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      )
      .end(buffer);
  });
}

export async function deleteImage(url: string): Promise<void> {
  const publicId = url.split("/").pop()?.split(".")[0];
  if (!publicId) return;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      `ecommerce/${publicId}`,
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}
