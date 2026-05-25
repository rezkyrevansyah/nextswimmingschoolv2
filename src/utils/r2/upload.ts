/**
 * R2 upload helpers — server-side only.
 * All functions return the public CDN URL of the uploaded file.
 */
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "./client";

// ── Key builders ─────────────────────────────────────────────────────────────

export const keys = {
  avatar:     (userId: string)                        => `avatars/${userId}/avatar.jpg`,
  logo:       (branchId: string)                      => `logos/${branchId}/logo.jpg`,
  selfie:     (coachId: string, date: string, classId: string) =>
                `attendances/${coachId}/${date}/${classId}.jpg`,
  qrcode:     (memberId: string)                      => `qrcodes/${memberId}.png`,
  payment:    (billId: string)                        => `payments/${billId}/proof.jpg`,
  cert:       (coachId: string, certId: string)       => `certs/${coachId}/${certId}.jpg`,
  invoice:    (invoiceId: string)                     => `invoices/${invoiceId}.pdf`,
  rapor:      (periodId: string, memberId: string)    => `rapors/${periodId}/${memberId}.pdf`,
  classPhoto: (classId: string)                       => `classes/${classId}/cover.jpg`,
} as const;

// ── Upload from a Buffer / Blob ───────────────────────────────────────────────

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}

// ── Presigned upload URL (for direct browser → R2 upload) ─────────────────────
// Use this to avoid routing large files through your Next.js server.

export async function presignUpload(
  key: string,
  contentType: string,
  expiresIn = 300 // seconds
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

// ── Derive public URL from key (no round-trip needed) ─────────────────────────

export function publicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
