/**
 * POST /api/admin/users
 * Body: { email, password, full_name, role, branch_id?, phone?,
 *         birth_date?, gender?, address?, health_notes?,
 *         member_type?, school_id?, class_id?, total_sessions? }
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

  const { data: callerProfile } = await supabase.from("profiles").select("role, branch_id").eq("id", user.id).single();
  const callerRole = (user.user_metadata?.role as string | undefined) ?? callerProfile?.role ?? undefined;
  if (!callerRole || !["admin", "owner"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const callerBranchId = callerProfile?.branch_id ?? (user.user_metadata?.branch_id as string | undefined) ?? null;

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
    total_sessions?: number | null;
  };

  const { email, password, full_name, role, branch_id, phone } = body;
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Missing required fields: email, password, full_name, role" }, { status: 400 });
  }

  // Admins can only create coach/member/school — not admin/owner
  if (callerRole === "admin" && !["coach", "member", "school"].includes(role)) {
    return NextResponse.json({ error: "Admin can only create coach, member, or school accounts" }, { status: 403 });
  }

  // Admins may only create accounts in their own branch
  if (callerRole === "admin" && branch_id && branch_id !== callerBranchId) {
    return NextResponse.json({ error: "Anda hanya dapat membuat akun di cabang Anda sendiri" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, branch_id, phone },
  });

  if (authError) {
    const isEmailTaken =
      authError.message.toLowerCase().includes("already been registered") ||
      authError.message.toLowerCase().includes("already registered") ||
      authError.message.toLowerCase().includes("email address is already") ||
      authError.message.toLowerCase().includes("duplicate");
    if (isEmailTaken) {
      return NextResponse.json(
        { error: `Email "${email}" sudah terdaftar. Gunakan email lain atau reset password akun yang ada.`, code: "EMAIL_TAKEN" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // Structured account ID (NEXT.xxx.ROLE.yy) — atomic per-role sequence, generated once.
  const { data: userNo } = await db.rpc("generate_user_no", { p_role: role });

  // Profile row: try insert first. If trigger already created a minimal row,
  // fall back to an explicit update so all fields (branch_id, role, etc.) are set.
  const profileData = {
    id: userId,
    role: role as "owner" | "admin" | "coach" | "member" | "school",
    full_name,
    email,
    phone: phone || null,
    branch_id: branch_id || null,
    birth_date: body.birth_date || null,
    gender: body.gender || null,
    address: body.address || null,
    health_notes: body.health_notes || null,
    is_profile_complete: false,
    ...(role !== "member" ? { user_no: userNo } : {}),
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

  // For coaches: also insert into coach_branches junction table
  if (role === "coach" && branch_id) {
    await db.from("coach_branches").upsert({
      coach_id: userId,
      branch_id,
      is_primary: true,
    }, { onConflict: "coach_id,branch_id" });
  }

  // For members: explicitly insert members row (no DB trigger for this),
  // then optionally assign to a class.
  let memberId: string | null = null;
  if (role === "member") {
    if (!branch_id) {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "branch_id required for member" }, { status: 400 });
    }

    const isPrivateMember = body.member_type === "private";
    const { data: memberRow, error: memberError } = await db
      .from("members")
      .insert({
        profile_id: userId,
        branch_id,
        type: (body.member_type ?? "reguler") as "reguler" | "private" | "school_affiliate",
        status: "active",
        school_id: body.school_id || null,
        date_start: new Date().toISOString().split("T")[0],
        total_sessions: isPrivateMember ? (body.total_sessions ?? null) : null,
        remaining_sessions: isPrivateMember ? (body.total_sessions ?? null) : null,
        member_no: userNo,
      })
      .select("id")
      .single();

    if (memberError) {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    memberId = memberRow?.id ?? null;

    if (body.class_id && memberRow) {
      await db.from("member_classes").insert({
        member_id: memberRow.id,
        class_id: body.class_id,
        joined_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ user_id: userId, member_id: memberId });
}
