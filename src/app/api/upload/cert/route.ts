/**
 * POST /api/upload/cert
 * Body: multipart/form-data { file: File, certId: string }
 * Returns: { url: string }
 *
 * Coach-only. Uploads certification photo and updates certifications.photo_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadToBucket, keys } from "@/utils/supabase-storage/upload";
import { BUCKET_PRIVATE } from "@/utils/supabase-storage/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file   = form.get("file")   as File | null;
  const certId = form.get("certId") as string | null;
  if (!file || !certId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  // Validate file type and size
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_SIZE_MB = 10;
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau PDF." }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
    return NextResponse.json({ error: `Ukuran file terlalu besar. Maksimum ${MAX_SIZE_MB}MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.cert(user.id, certId);
  await uploadToBucket(BUCKET_PRIVATE, key, buffer, file.type || "image/jpeg");

  await supabase
    .from("certifications")
    .update({ photo_url: key })
    .eq("id", certId)
    .eq("coach_id", user.id); // ensure ownership

  return NextResponse.json({ url: key });
}
