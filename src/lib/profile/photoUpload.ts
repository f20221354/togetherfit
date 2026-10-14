"use client";

/**
 * Prepares a photo in the browser before upload: square centre crop, scaled
 * to at most 1024px, saved as JPEG. Keeps uploads small and turns iPhone
 * HEIC photos into something the server can read. The server re-encodes it
 * again anyway (that's where EXIF/GPS is stripped).
 */
const MAX_SIDE = 1024;

export async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(side, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't prepare the photo"))), "image/jpeg", 0.9)
  );
}

export async function uploadProfilePhoto(blob: Blob): Promise<{ ok: true; photoId: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("photo", blob, "photo.jpg");
  try {
    const res = await fetch("/api/profile/photo", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    return data.ok ? { ok: true, photoId: data.photoId } : { ok: false, error: data.error ?? "Upload failed. Please try again." };
  } catch {
    return { ok: false, error: "Can't reach togetherfit. Check your connection." };
  }
}
