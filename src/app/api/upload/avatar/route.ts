/**
 * POST /api/upload/avatar
 * Body: multipart/form-data { file: File, profile_id?: string }
 * Returns: { url: string }
 *
 * Authenticated. If profile_id is provided and differs from the caller,
 * the caller must be admin/owner — the update is done via the service role
 * client to bypass RLS.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import { uploadBuffer, keys } from "@/utils/r2/upload";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Optional: admin can upload for another profile by passing profile_id
  const profileIdParam = form.get("profile_id") as string | null;
  const targetId = profileIdParam ?? user.id;

  // If uploading for someone else, caller must be admin or owner
  if (targetId !== user.id) {
    const callerRole = user.user_metadata?.role as string | undefined;
    if (!callerRole || !["admin", "owner"].includes(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.avatar(targetId);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  // Use admin client when updating another user's row (bypasses RLS)
  const db = targetId !== user.id ? getSupabaseAdmin() : supabase;
  await db
    .from("profiles")
    .update({ avatar_url: url, is_profile_complete: true })
    .eq("id", targetId);

  return NextResponse.json({ url });
}
