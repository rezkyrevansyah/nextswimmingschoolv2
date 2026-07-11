"use client";
/**
 * useUpload — thin React hook for all file uploads via Route Handlers.
 * All uploads go server-side → R2. Never touches R2 credentials on the client.
 *
 * Usage:
 *   const { upload, uploading } = useUpload();
 *   const url = await upload.avatar(file);
 *   const url = await upload.selfie(file, classId, date);
 */
import { useState } from "react";

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
      run(() => postForm("/api/upload/avatar", { file })),

    /** Profile picture uploaded by admin for another profile */
    avatarForProfile: (file: File, profileId: string) =>
      run(() => postForm("/api/upload/avatar", { file, profile_id: profileId })),

    /** Coach clock-in selfie */
    selfie: (file: File, classId: string, date: string) =>
      run(() => postForm("/api/upload/selfie", { file, classId, date })),

    /** Payment proof (admin uploads) */
    paymentProof: (file: File, billId: string) =>
      run(() => postForm("/api/upload/payment-proof", { file, billId })),

    /** Coach certification photo */
    cert: (file: File, certId: string) =>
      run(() => postForm("/api/upload/cert", { file, certId })),

    /** Branch logo (admin/owner) */
    logo: (file: File, branchId: string) =>
      run(() => postForm("/api/upload/logo", { file, branchId })),

    /** Class cover photo (admin/owner) */
    classPhoto: (file: File, classId: string) =>
      run(() => postForm("/api/upload/class-photo", { file, classId })),

    /** Coach signature image (coach only — stored in profiles.signature_url) */
    signature: (file: File) =>
      run(() => postForm("/api/upload/signature", { file })),
  };

  return { upload, uploading };
}
