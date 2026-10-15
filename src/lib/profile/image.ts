import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 200;
const READABLE = new Set(["jpeg", "png", "webp", "avif", "heif"]);
// Refuse "decompression bombs": tiny files that expand to gigantic images.
const LIMIT_INPUT_PIXELS = 40_000_000;

export type ProcessedPhoto = { ok: true; large: Buffer; small: Buffer } | { ok: false; error: string };

/**
 * Turns an upload into clean profile images. Re-encoding means nothing from
 * the original file survives except the pixels: no EXIF, so no GPS location
 * of where the photo was taken, no camera serials, no hidden payloads.
 */
export async function processProfilePhoto(input: Buffer): Promise<ProcessedPhoto> {
  const meta = await sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS })
    .metadata()
    .catch(() => null);
  if (!meta) return { ok: false, error: "That file isn't an image we can read. Try a JPG or PNG." };
  if (!meta.format || !READABLE.has(meta.format)) return { ok: false, error: "Please upload a JPG, PNG or WebP photo." };
  if ((meta.width ?? 0) < MIN_SIDE || (meta.height ?? 0) < MIN_SIDE) {
    return { ok: false, error: `Please use a photo at least ${MIN_SIDE}×${MIN_SIDE} pixels.` };
  }
  try {
    // rotate() applies the EXIF orientation before the metadata is dropped (sharp drops it by default).
    const base = sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS }).rotate();
    const [large, small] = await Promise.all([
      base.clone().resize(512, 512, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer(),
      base.clone().resize(128, 128, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer(),
    ]);
    return { ok: true, large, small };
  } catch {
    return { ok: false, error: "We couldn't process that photo. Try another one." };
  }
}
