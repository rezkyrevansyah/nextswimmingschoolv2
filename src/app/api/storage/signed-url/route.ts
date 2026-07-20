/**
 * POST /api/storage/signed-url
 * Body: JSON { key: string }
 * Returns: { url: string }
 *
 * Resolves a private-bucket storage key to a short-lived signed URL.
 * Authenticated only. No per-key role check: the caller only ever learns a
 * private key by having already passed RLS on the row that stores it
 * (bills.proof_url, certifications.photo_url, coach_attendances.selfie_url),
 * so re-checking here would duplicate access control that already happened.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { signedUrl } from "@/utils/supabase-storage/upload";
import { BUCKET_PRIVATE } from "@/utils/supabase-storage/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { key?: string };
  const { key } = body;
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const url = await signedUrl(BUCKET_PRIVATE, key);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
