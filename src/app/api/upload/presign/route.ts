/**
 * POST /api/upload/presign
 * Body: JSON { key: string, contentType: string }
 * Returns: { uploadUrl: string, publicUrl: string }
 *
 * Generic presigned URL endpoint for direct browser → R2 upload.
 * Only allowed keys: avatars/*, attendances/*, qrcodes/*, invoices/*, rapors/*
 * Requires authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { presignUpload, publicUrl } from "@/utils/r2/upload";

const ALLOWED_PREFIXES = [
  "avatars/",
  "attendances/",
  "qrcodes/",
  "invoices/",
  "rapors/",
  "certs/",
  "payments/",
  "logos/",
  "classes/",
];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { key?: string; contentType?: string };
  const { key, contentType } = body;

  if (!key || !contentType) {
    return NextResponse.json({ error: "Missing key or contentType" }, { status: 400 });
  }

  const allowed = ALLOWED_PREFIXES.some((p) => key.startsWith(p));
  if (!allowed) {
    return NextResponse.json({ error: "Key prefix not allowed" }, { status: 403 });
  }

  const uploadUrl = await presignUpload(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl: publicUrl(key) });
}
