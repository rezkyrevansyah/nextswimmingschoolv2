import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import { maskMemberName } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callerRole = user.user_metadata?.role as string | undefined;
  if (!callerRole || !["admin", "owner"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branchId = req.nextUrl.searchParams.get("branchId");
  if (!branchId) {
    return NextResponse.json({ error: "branchId required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("member_reviews")
    .select("id, stars, message, created_at, coach_id, coach:profiles!member_reviews_coach_id_fkey(full_name), member:members!member_reviews_member_id_fkey(profile:profiles(full_name)), rapor:rapor_entries!inner!member_reviews_rapor_id_fkey(class:classes!inner(branch_id), rapor_periods(label))")
    .eq("rapor.class.branch_id", branchId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }

  const rows = (data as unknown as {
    id: string; stars: number; message: string | null; created_at: string; coach_id: string;
    coach: { full_name: string } | null;
    member: { profile: { full_name: string } | null } | null;
    rapor: { rapor_periods: { label: string } | null } | null;
  }[]).map(r => ({
    id: r.id,
    stars: r.stars,
    message: r.message,
    created_at: r.created_at,
    coach_id: r.coach_id,
    coach_name: r.coach?.full_name ?? "—",
    member_name: maskMemberName(r.member?.profile?.full_name),
    period_label: r.rapor?.rapor_periods?.label ?? "—",
  }));

  return NextResponse.json({ reviews: rows });
}
