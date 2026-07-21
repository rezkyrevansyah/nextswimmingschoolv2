/**
 * GET /api/coach/attendance-detail?classId=xxx&date=yyyy-mm-dd
 * Returns per-member attendance status for one class session, with the
 * member's name resolved server-side (see class-members/route.ts for why —
 * same `profiles` RLS block applies here).
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

  const classId = req.nextUrl.searchParams.get("classId");
  const date = req.nextUrl.searchParams.get("date");
  if (!classId || !date) return NextResponse.json({ error: "classId dan date wajib diisi." }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: teaches } = await db.from("class_coaches").select("class_id").eq("class_id", classId).eq("coach_id", user.id).maybeSingle();
  if (!teaches) return NextResponse.json({ error: "Anda tidak mengajar kelas ini." }, { status: 403 });

  const { data, error } = await db
    .from("member_attendances")
    .select("member_id, status, method, member:members(profile:profiles(full_name))")
    .eq("class_id", classId)
    .eq("session_date", date)
    .order("status");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map(r => ({
    member_id: r.member_id,
    full_name: r.member?.profile?.full_name ?? "—",
    status: r.status,
    method: r.method ?? "",
  }));

  return NextResponse.json({ rows });
}
