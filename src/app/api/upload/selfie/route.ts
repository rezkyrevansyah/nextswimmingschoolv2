/**
 * POST /api/upload/selfie
 * Body: multipart/form-data { file: File, date: string (YYYY-MM-DD), classId?: string }
 * Returns: { url: string } — private-bucket storage KEY, not a browsable URL.
 *
 * Coach (class clock-in) or staff (calendar-day clock-in). The client writes
 * the returned key onto coach_attendances.selfie_url / staff_attendances.selfie_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadToBucket, keys } from "@/utils/supabase-storage/upload";
import { BUCKET_PRIVATE } from "@/utils/supabase-storage/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role;
  if (role !== "coach" && role !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file    = form.get("file")    as File | null;
  const classId = form.get("classId") as string | null;
  const date    = form.get("date")    as string | null;

  if (!file || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (role === "coach" && !classId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_SIZE_MB = 5;
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
    return NextResponse.json({ error: `Ukuran file terlalu besar. Maksimum ${MAX_SIZE_MB}MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = role === "staff"
    ? keys.staffSelfie(user.id, date)
    : keys.selfie(user.id, date, classId as string);
  await uploadToBucket(BUCKET_PRIVATE, key, buffer, file.type || "image/jpeg");

  return NextResponse.json({ url: key });
}
