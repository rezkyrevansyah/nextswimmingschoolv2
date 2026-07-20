/**
 * POST /api/upload/presign
 * Body: JSON { key: string }
 * Returns: { uploadUrl: string, publicUrl: string | null }
 *
 * Generic presigned URL endpoint for direct browser → Supabase Storage upload.
 * Only allowed keys: avatars/*, attendances/*, certs/*, payments/*, logos/*, classes/*
 * Requires authentication. Private-prefix keys (attendances/, certs/, payments/)
 * get publicUrl: null since they belong to the private bucket.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { presignUpload, publicUrl } from "@/utils/supabase-storage/upload";
import { BUCKET_PUBLIC, BUCKET_PRIVATE } from "@/utils/supabase-storage/client";

const PUBLIC_PREFIXES = ["avatars/", "logos/", "classes/"];
const PRIVATE_PREFIXES = ["attendances/", "certs/", "payments/"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { key?: string };
  const { key } = body;

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => key.startsWith(p));
  const isPrivate = PRIVATE_PREFIXES.some((p) => key.startsWith(p));
  if (!isPublic && !isPrivate) {
    return NextResponse.json({ error: "Key prefix not allowed" }, { status: 403 });
  }

  const bucket = isPublic ? BUCKET_PUBLIC : BUCKET_PRIVATE;
  const uploadUrl = await presignUpload(bucket, key);

  return NextResponse.json({ uploadUrl, publicUrl: isPublic ? publicUrl(bucket, key) : null });
}
