/**
 * POST /api/admin/coaches/[coachId]/branches
 * Body: { branch_id: string }
 * Links an existing coach to a branch without creating a new account.
 * Only callable by admin or owner.
 *
 * DELETE /api/admin/coaches/[coachId]/branches
 * Body: { branch_id: string }
 * Removes a coach from a branch (unlinks). Cannot remove primary branch if it's the only one.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = user.user_metadata?.role as string | undefined;
  if (!callerRole || !["admin", "owner"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { coachId } = await params;
  const body = await req.json() as { branch_id?: string };
  const { branch_id } = body;

  if (!branch_id) {
    return NextResponse.json({ error: "branch_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Verify target is a coach
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", coachId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Coach tidak ditemukan" }, { status: 404 });
  }
  if (profile.role !== "coach") {
    return NextResponse.json({ error: "Akun ini bukan coach" }, { status: 400 });
  }

  // Check if already linked
  const { data: existing } = await db
    .from("coach_branches")
    .select("id")
    .eq("coach_id", coachId)
    .eq("branch_id", branch_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Coach sudah terdaftar di cabang ini", code: "ALREADY_LINKED" },
      { status: 409 }
    );
  }

  // Check if this coach has any existing branch (to determine is_primary)
  const { count } = await db
    .from("coach_branches")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId);

  const isPrimary = (count ?? 0) === 0;

  const { error: insertError } = await db.from("coach_branches").insert({
    coach_id: coachId,
    branch_id,
    is_primary: isPrimary,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, full_name: profile.full_name });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = user.user_metadata?.role as string | undefined;
  if (!callerRole || !["admin", "owner"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { coachId } = await params;
  const body = await req.json() as { branch_id?: string };
  const { branch_id } = body;

  if (!branch_id) {
    return NextResponse.json({ error: "branch_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Count how many branches this coach has
  const { count } = await db
    .from("coach_branches")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId);

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Coach harus terdaftar minimal di satu cabang" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("coach_branches")
    .delete()
    .eq("coach_id", coachId)
    .eq("branch_id", branch_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
