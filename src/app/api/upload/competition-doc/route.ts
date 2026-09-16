/**
 * POST /api/upload/competition-doc
 * Body: multipart/form-data { file: File, competitionId: string, memberId: string }
 * Returns: { url: string }
 *
 * Admin/Owner only. Uploads a single certificate/photo document covering every
 * category a member won at one competition (upserted by competition_id+member_id,
 * not one per achievement row).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadToBucket, keys } from "@/utils/supabase-storage/upload";
import { BUCKET_PUBLIC } from "@/utils/supabase-storage/client";

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
  const file          = form.get("file")          as File | null;
  const competitionId = form.get("competitionId") as string | null;
  const memberId       = form.get("memberId")       as string | null;
  if (!file || !competitionId || !memberId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_SIZE_MB = 10;
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau PDF." }, { status: 400 });
  }
  if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
    return NextResponse.json({ error: `Ukuran file terlalu besar. Maksimum ${MAX_SIZE_MB}MB.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.competitionDoc(competitionId, memberId);
  const url = await uploadToBucket(BUCKET_PUBLIC, key, buffer, file.type || "image/jpeg");

  const { error } = await supabase
    .from("competition_documents")
    .upsert(
      { competition_id: competitionId, member_id: memberId, document_url: url, content_type: file.type, uploaded_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: "competition_id,member_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url, content_type: file.type });
}
