/**
 * POST /api/upload/selfie
 * Body: multipart/form-data { file: File, classId: string, date: string (YYYY-MM-DD) }
 * Returns: { url: string }
 *
 * Coach-only. Uploads clock-in selfie and stores URL in coach_attendances.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadBuffer, keys } from "@/utils/r2/upload";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file    = form.get("file")    as File | null;
  const classId = form.get("classId") as string | null;
  const date    = form.get("date")    as string | null;

  if (!file || !classId || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Validate file type and size
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_SIZE_MB = 5;
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
    return NextResponse.json({ error: `Ukuran file terlalu besar. Maksimum ${MAX_SIZE_MB}MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.selfie(user.id, date, classId);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  return NextResponse.json({ url });
}
