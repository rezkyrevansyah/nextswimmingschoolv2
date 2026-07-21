/**
 * GET /api/coach/rapor-entries?periodId=xxx
 * Returns this coach's rapor entries for a period, with member profile and
 * co-teaching coaches' names/signatures resolved server-side — the nested
 * `profile:profiles(...)` reads are blocked by RLS when done client-side as
 * a coach (see class-members/route.ts for the full explanation).
 *
 * Only reads — the period lookup, class ownership, and stub-entry creation
 * stay client-side (those touch only the coach's own rows, unaffected by
 * the profiles RLS block).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periodId = req.nextUrl.searchParams.get("periodId");
  if (!periodId) return NextResponse.json({ error: "periodId wajib diisi." }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("rapor_entries")
    .select("id, member_id, class_id, locked, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id, member:members(member_no, profile:profiles(full_name, avatar_url, birth_date)), class:classes(name, rapor_signer_coach_id, class_coaches(coach_id, role, profile:profiles(full_name, signature_url)))")
    .eq("period_id", periodId)
    .eq("coach_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data ?? [] });
}
