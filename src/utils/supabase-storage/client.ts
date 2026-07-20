/**
 * Supabase Storage — server-side only.
 * Never import this in "use client" components — use the upload Route
 * Handlers instead.
 */
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export const storage = () => getSupabaseAdmin().storage;

/** Public bucket — avatars, logos, class photos, signatures, landing images. */
export const BUCKET_PUBLIC = "next-storage";

/** Private bucket — payment proofs, certifications, attendance selfies. */
export const BUCKET_PRIVATE = "next-storage-private";
