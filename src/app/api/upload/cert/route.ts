/**
 * POST /api/upload/cert
 * Body: multipart/form-data { file: File, certId: string }
 * Returns: { url: string }
 *
 * Coach-only. Uploads certification photo and updates certifications.photo_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadBuffer, keys } from "@/utils/r2/upload";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file   = form.get("file")   as File | null;
  const certId = form.get("certId") as string | null;
  if (!file || !certId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.cert(user.id, certId);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  await supabase
    .from("certifications")
    .update({ photo_url: url })
    .eq("id", certId)
    .eq("coach_id", user.id); // ensure ownership

  return NextResponse.json({ url });
}
