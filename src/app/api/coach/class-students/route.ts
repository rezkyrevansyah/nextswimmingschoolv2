/**
 * GET /api/coach/class-members?classIds=id1,id2,...
 * Returns member rosters (grouped by class_id) for classes this coach
 * teaches. Coach-only; only classIds the requesting coach actually teaches
 * are honored — any others are silently dropped from the result.
 *
 * Runs server-side via the service role client because `profiles` RLS only
 * allows a user to read their own row (or admin/owner) — a coach reading
 * another user's (member's) profile directly from the browser is blocked by
 * RLS regardless of query shape. This route intentionally bypasses that for
 * the one legitimate case (a coach viewing their own class rosters).
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

  const requestedIds = (req.nextUrl.searchParams.get("classIds") ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (requestedIds.length === 0) return NextResponse.json({ error: "classIds wajib diisi." }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: taught } = await db.from("class_coaches").select("class_id").eq("coach_id", user.id).in("class_id", requestedIds);
  const classIds = (taught ?? []).map(t => t.class_id);
  if (classIds.length === 0) return NextResponse.json({ membersByClass: {} });

  const { data, error } = await db
    .from("member_classes")
    .select("class_id, member:members(id, profile:profiles(full_name, avatar_url, birth_date, phone, gender, address, health_notes))")
    .in("class_id", classIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const membersByClass: Record<string, unknown[]> = {};
  for (const row of data ?? []) {
    if (!row.member) continue;
    (membersByClass[row.class_id] ??= []).push(row.member);
  }

  return NextResponse.json({ membersByClass });
}
