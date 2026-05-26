/**
 * POST /api/admin/users
 * Body: { email, password, full_name, role, branch_id?, phone?,
 *         birth_date?, gender?, address?, health_notes?,
 *         member_type?, school_id?, class_id? }
 * Creates a Supabase auth user + profile row + optional member row setup.
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = user.user_metadata?.role as string | undefined;
  if (!callerRole || !["admin", "owner"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
    branch_id?: string;
    phone?: string;
    // Member-specific extras
    birth_date?: string;
    gender?: string;
    address?: string;
    health_notes?: string;
    member_type?: string;
    school_id?: string;
    class_id?: string;
  };

  const { email, password, full_name, role, branch_id, phone } = body;
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Missing required fields: email, password, full_name, role" }, { status: 400 });
  }

  // Admins can only create coach/member — not admin/owner
  if (callerRole === "admin" && !["coach", "member"].includes(role)) {
    return NextResponse.json({ error: "Admin can only create coach or member accounts" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, branch_id, phone },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // Profile row: try insert first. If trigger already created a minimal row,
  // fall back to an explicit update so all fields (branch_id, role, etc.) are set.
  const profileData = {
    id: userId,
    role,
    full_name,
    email,
    phone: phone || null,
    branch_id: branch_id || null,
    birth_date: body.birth_date || null,
    gender: body.gender || null,
    address: body.address || null,
    health_notes: body.health_notes || null,
    is_profile_complete: false,
  };

  const { error: insertError } = await db.from("profiles").insert(profileData);

  if (insertError) {
    if (insertError.code === "23505") {
      // Duplicate — trigger already inserted a row, update it instead
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...updateData } = profileData;
      const { error: updateError } = await db
        .from("profiles")
        .update(updateData)
        .eq("id", userId);
      if (updateError) {
        await db.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // For members: explicitly insert members row (no DB trigger for this),
  // then optionally assign to a class.
  if (role === "member") {
    if (!branch_id) {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "branch_id required for member" }, { status: 400 });
    }

    const { data: memberRow, error: memberError } = await db
      .from("members")
      .insert({
        profile_id: userId,
        branch_id,
        type: body.member_type ?? "reguler",
        status: "active",
        school_id: body.school_id || null,
        date_start: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();

    if (memberError) {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (body.class_id && memberRow) {
      await db.from("member_classes").insert({
        member_id: memberRow.id,
        class_id: body.class_id,
        joined_at: new Date().toISOString(),
      });
    }
  }

  // Verify profile was saved correctly (debug aid)
  const { data: savedProfile } = await db
    .from("profiles")
    .select("id, role, branch_id, full_name")
    .eq("id", userId)
    .single();

  return NextResponse.json({ user_id: userId, _debug: savedProfile });
}
