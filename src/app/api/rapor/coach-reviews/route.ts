import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import { maskMemberName } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("member_reviews")
    .select("id, stars, message, created_at, member:members!member_reviews_member_id_fkey(profile:profiles(full_name)), rapor:rapor_entries!member_reviews_rapor_id_fkey(rapor_periods(label))")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }

  const rows = (data as unknown as {
    id: string; stars: number; message: string | null; created_at: string;
    member: { profile: { full_name: string } | null } | null;
    rapor: { rapor_periods: { label: string } | null } | null;
  }[]).map(r => ({
    id: r.id,
    stars: r.stars,
    message: r.message,
    created_at: r.created_at,
    member_name: maskMemberName(r.member?.profile?.full_name),
    period_label: r.rapor?.rapor_periods?.label ?? "—",
  }));

  return NextResponse.json({ reviews: rows });
}
