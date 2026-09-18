/**
 * GET /api/public/stats
 * Returns live counts for the landing page trust strip.
 * Public endpoint — no auth required, uses service role to bypass RLS.
 */
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function GET() {
  const db = getSupabaseAdmin();

  const [branches, students, coaches, classes] = await Promise.all([
    db.from("branches")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),

    db.from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),

    db.from("certifications")
      .select("coach_id")
      .eq("status", "approved"),

    db.from("classes")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const certRows = (coaches.data ?? []) as { coach_id: string }[];
  const uniqueCoaches = new Set(certRows.map((r) => r.coach_id)).size;

  return NextResponse.json({
    branches: branches.count ?? 0,
    students: students.count ?? 0,
    coaches: uniqueCoaches,
    classes: classes.count ?? 0,
  });
}
