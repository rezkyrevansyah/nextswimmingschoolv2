/**
 * POST /api/owner/init-profile
 * Auto-creates owner profile row if missing (e.g. after DB reset).
 * Only callable by authenticated users with role=owner in user_metadata.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  // Check if profile already exists
  const { data: existing } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, created: false });

  // Create profile row
  const { error } = await db.from("profiles").insert({
    id: user.id,
    role: "owner",
    full_name: user.user_metadata?.full_name ?? "Owner",
    email: user.email ?? null,
    phone: user.user_metadata?.phone ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, created: true });
}
