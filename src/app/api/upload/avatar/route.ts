/**
 * POST /api/upload/avatar
 * Body: multipart/form-data { file: File }
 * Returns: { url: string }
 *
 * Authenticated — uploads the calling user's profile picture to R2
 * then updates profiles.avatar_url in Supabase.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadBuffer, keys } from "@/utils/r2/upload";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.avatar(user.id);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  return NextResponse.json({ url });
}
