"use client";
/**
 * useUpload — thin React hook for all file uploads via Route Handlers.
 * All uploads go server-side → Supabase Storage. Never touches storage
 * credentials on the client.
 *
 * Usage:
 *   const { upload, uploading } = useUpload();
 *   const url = await upload.avatar(file);
 *   const url = await upload.selfie(file, classId, date);
 *
 * Note: `selfie`, `paymentProof`, and `cert` write to the private bucket —
 * the string they resolve to is a storage KEY, not a browsable URL. Render
 * it via useSignedUrl(key) (src/hooks/useSignedUrl.ts), not <img src>.
 */
import { useState } from "react";

/** Downscales/re-encodes image files before upload; skips PDFs and small files. Dynamically imported so the Canvas code isn't in the initial bundle. */
async function compressIfImage(file: File): Promise<File> {
  const { compressImage } = await import("@/lib/imageCompress");
  return compressImage(file);
}

async function postForm(endpoint: string, fields: Record<string, string | File>): Promise<string> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);

  const res = await fetch(endpoint, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Upload failed");
  }
  const data = await res.json() as { url: string };
  return data.url;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    setUploading(true);
    try {
      return await fn();
    } finally {
      setUploading(false);
    }
  }

  const upload = {
    /** Profile picture for the logged-in user */
    avatar: (file: File) =>
      run(async () => postForm("/api/upload/avatar", { file: await compressIfImage(file) })),

    /** Profile picture uploaded by admin for another profile */
    avatarForProfile: (file: File, profileId: string) =>
      run(async () => postForm("/api/upload/avatar", { file: await compressIfImage(file), profile_id: profileId })),

    /** Coach clock-in selfie */
    selfie: (file: File, classId: string, date: string) =>
      run(async () => postForm("/api/upload/selfie", { file: await compressIfImage(file), classId, date })),

    /** Payment proof (admin uploads) */
    paymentProof: (file: File, billId: string) =>
      run(async () => postForm("/api/upload/payment-proof", { file: await compressIfImage(file), billId })),

    /** Coach certification photo */
    cert: (file: File, certId: string) =>
      run(async () => postForm("/api/upload/cert", { file: await compressIfImage(file), certId })),

    /** Branch logo (admin/owner) */
    logo: (file: File, branchId: string) =>
      run(async () => postForm("/api/upload/logo", { file: await compressIfImage(file), branchId })),

    /** Class cover photo (admin/owner) */
    classPhoto: (file: File, classId: string) =>
      run(async () => postForm("/api/upload/class-photo", { file: await compressIfImage(file), classId })),

    /** Coach signature image (coach only — stored in profiles.signature_url). Not compressed: small line art, quality-sensitive. */
    signature: (file: File) =>
      run(() => postForm("/api/upload/signature", { file })),

    /** Landing page image (owner only). Row targets require the row id. */
    landingImage: (
      file: File,
      target: "hero" | "safety" | "facility" | "testimonial" | "gallery" | "partner" | "program",
      id?: string,
    ) =>
      run(async () => {
        const compressed = await compressIfImage(file);
        return postForm("/api/upload/landing-image", id ? { file: compressed, target, id } : { file: compressed, target });
      }),
  };

  return { upload, uploading };
}
