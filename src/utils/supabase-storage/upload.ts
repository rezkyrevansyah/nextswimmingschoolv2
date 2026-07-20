/**
 * Supabase Storage upload helpers — server-side only.
 */
import { storage, BUCKET_PUBLIC, BUCKET_PRIVATE } from "./client";

// ── Key builders ─────────────────────────────────────────────────────────────

export const keys = {
  avatar:     (userId: string)                        => `avatars/${userId}/avatar.jpg`,
  logo:       (branchId: string)                      => `logos/${branchId}/logo.jpg`,
  selfie:     (coachId: string, date: string, classId: string) =>
                `attendances/${coachId}/${date}/${classId}.jpg`,
  payment:    (billId: string)                        => `payments/${billId}/proof.jpg`,
  cert:       (coachId: string, certId: string)       => `certs/${coachId}/${certId}.jpg`,
  classPhoto: (classId: string)                       => `classes/${classId}/cover.jpg`,
  signature:  (coachId: string)                        => `signatures/${coachId}/signature.png`,
  landingHero:        ()             => `landing/hero/background.jpg`,
  landingSafety:      ()             => `landing/safety/photo.jpg`,
  landingFacility:    (id: string)   => `landing/facilities/${id}.jpg`,
  landingTestimonial: (id: string)   => `landing/testimonials/${id}.jpg`,
  landingGallery:     (id: string)   => `landing/gallery/${id}.jpg`,
  landingPartner:     (id: string)   => `landing/partners/${id}.jpg`,
} as const;

// ── Upload from a Buffer ─────────────────────────────────────────────────────

/**
 * Uploads a buffer to the given bucket/key and returns the resolved access
 * URL: a cache-busted public URL for BUCKET_PUBLIC, or the raw key (to be
 * resolved to a signed URL on render) for BUCKET_PRIVATE.
 */
export async function uploadToBucket(
  bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE,
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await storage()
    .from(bucket)
    .upload(key, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);

  return bucket === BUCKET_PUBLIC ? `${publicUrl(bucket, key)}?v=${Date.now()}` : key;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteFile(bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE, key: string): Promise<void> {
  const { error } = await storage().from(bucket).remove([key]);
  if (error) throw new Error(error.message);
}

// ── Presigned upload URL (for direct browser → Supabase Storage upload) ──────

export async function presignUpload(
  bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE,
  key: string
): Promise<string> {
  const { data, error } = await storage().from(bucket).createSignedUploadUrl(key);
  if (error || !data) throw new Error(error?.message ?? "Failed to create signed upload URL");
  return data.signedUrl;
}

// ── Derive public URL from key (no round-trip needed; BUCKET_PUBLIC only) ───

export function publicUrl(bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE, key: string): string {
  return storage().from(bucket).getPublicUrl(key).data.publicUrl;
}

// ── Signed URL for private files ─────────────────────────────────────────────

export async function signedUrl(bucket: typeof BUCKET_PRIVATE, key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await storage().from(bucket).createSignedUrl(key, expiresInSeconds);
  if (error || !data) throw new Error(error?.message ?? "Failed to create signed URL");
  return data.signedUrl;
}
