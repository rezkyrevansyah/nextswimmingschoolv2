/**
 * POST /api/upload/class-photo
 * Body: multipart/form-data { file: File, classId: string }
 * Returns: { url: string }
 *
 * Admin/Owner only. Uploads class cover photo and updates classes.photo_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadBuffer, keys } from "@/utils/r2/upload";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file    = form.get("file")    as File | null;
  const classId = form.get("classId") as string | null;
  if (!file || !classId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.classPhoto(classId);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  await supabase.from("classes").update({ photo_url: url }).eq("id", classId);

  return NextResponse.json({ url });
}
