/**
 * Client-only helper: pad an image file to a square canvas without cropping,
 * preserving transparency for formats that support it (PNG/WebP/GIF). Used
 * for logo uploads (e.g. partner logos) where a consistent square aspect
 * ratio is required but the source image may be any shape.
 */
export async function padImageToSquare(file: File, size = 512): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const dx = (size - drawWidth) / 2;
  const dy = (size - drawHeight) / 2;

  ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);
  bitmap.close();

  const outputType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outputType, 0.92));
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, outputType === "image/png" ? ".png" : ".jpg");
  return new File([blob], newName, { type: outputType });
}
