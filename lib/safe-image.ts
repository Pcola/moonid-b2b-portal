import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_DIMENSION = 8_000;
const OUTPUT_DIMENSION = 2_400;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export type NormalizedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
};

/**
 * Dekóduje nedôveryhodné bajty, kontroluje skutočný formát/pixel bombu a re-enkóduje iba prvý
 * statický frame do WebP. Sharp bez withMetadata odstráni EXIF/GPS aj ostatné metadata.
 */
export async function normalizeImageBuffer(input: Buffer, maxBytes = MAX_UPLOAD_IMAGE_BYTES): Promise<NormalizedImage> {
  if (input.byteLength === 0 || input.byteLength > maxBytes) throw new Error("Neplatná veľkosť obrázka.");

  try {
    const decoder = sharp(input, { failOn: "warning", limitInputPixels: MAX_PIXELS, animated: false });
    const metadata = await decoder.metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) throw new Error("format");
    if (!metadata.width || !metadata.height || metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) throw new Error("dimensions");
    if ((metadata.pages ?? 1) > 1) throw new Error("animation");

    const { data, info } = await decoder
      .rotate()
      .resize({ width: OUTPUT_DIMENSION, height: OUTPUT_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || data.byteLength > maxBytes) throw new Error("output");
    return { buffer: data, contentType: "image/webp", extension: "webp", width: info.width, height: info.height };
  } catch {
    // Nevracaj klientovi libvips/sharp parser detaily.
    throw new Error("Nepovolený alebo poškodený obsah obrázka.");
  }
}

export async function normalizeImageFile(file: File): Promise<NormalizedImage> {
  if (file.size === 0 || file.size > MAX_UPLOAD_IMAGE_BYTES) throw new Error("Obrázok je príliš veľký (max 5 MB).");
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    throw new Error("Nepovolený formát obrázka (JPG, PNG, WEBP alebo statický GIF).");
  }
  return normalizeImageBuffer(Buffer.from(await file.arrayBuffer()), MAX_UPLOAD_IMAGE_BYTES);
}
