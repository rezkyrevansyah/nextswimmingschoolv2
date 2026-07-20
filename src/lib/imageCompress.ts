/**
 * Client-only helper: downscale + re-encode an image file before upload, to
 * cut storage/bandwidth for photos straight off a phone camera (often
 * 3000px+ and several MB) down to what a preview/review UI actually needs.
 * PNG sources are kept as PNG (resize only, no forced JPEG re-encode) so
 * transparency in logos/landing graphics isn't lost. Non-images (PDFs) and
 * already-small files are returned unchanged.
 */
const SKIP_BELOW_BYTES = 300 * 1024;

export async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < SKIP_BELOW_BYTES) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? quality : undefined)
  );
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.\w+$/, outputType === "image/png" ? ".png" : ".jpg");
  return new File([blob], newName, { type: outputType });
}
