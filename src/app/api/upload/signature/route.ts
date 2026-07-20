/**
 * POST /api/upload/signature
 * Body: multipart/form-data { file: File }
 * Returns: { url: string }
 *
 * Authenticated. Coach uploads their own signature image; stored in
 * Supabase Storage and URL saved to profiles.signature_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadToBucket, keys } from "@/utils/supabase-storage/upload";
import { BUCKET_PUBLIC } from "@/utils/supabase-storage/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > 2) {
    return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimum 2MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.signature(user.id);
  const url = await uploadToBucket(BUCKET_PUBLIC, key, buffer, file.type || "image/png");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from("profiles").update({ signature_url: url } as any).eq("id", user.id);

  return NextResponse.json({ url });
}
