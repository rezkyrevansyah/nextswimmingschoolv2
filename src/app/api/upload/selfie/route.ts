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

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.selfie(user.id, date, classId);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  return NextResponse.json({ url });
}
