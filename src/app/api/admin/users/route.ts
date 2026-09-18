/**
 * POST /api/admin/users
 * Body: { email, password, full_name, role, branch_id?, phone?,
 *         birth_date?, gender?, address?, health_notes?,
 *         student_type?, school_id?, class_id?, total_sessions? }
 * Creates a Supabase auth user + profile row + optional student row setup.
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
    // Student-specific extras
    birth_date?: string;
    gender?: string;
    address?: string;
    health_notes?: string;
    student_type?: string;
    school_id?: string;
    school_grade?: string;
    class_id?: string;
    total_sessions?: number | null;
    custom_role_label?: string;
    bank_name?: string;
    bank_account?: string;
    bank_holder?: string;
    // Admin-specific: auto-create a paired staff account
    auto_staff?: { email: string; password: string; full_name?: string } | null;
    // When approving a public registration: link + close out the
    // registrations row in the same request as account creation, so the two
    // can't drift apart if one half fails.
    registration_id?: string;
    proof_url?: string | null;
  };

  const { email, password, full_name, role, branch_id, phone } = body;
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Missing required fields: email, password, full_name, role" }, { status: 400 });
  }

  // Admins can only create coach/student/school/staff — not admin/owner
  if (callerRole === "admin" && !["coach", "student", "school", "staff"].includes(role)) {
    return NextResponse.json({ error: "Admin can only create coach, student, school, or staff accounts" }, { status: 403 });
  }

  // Admins may only create accounts in their own branch
  if (callerRole === "admin" && branch_id && branch_id !== callerBranchId) {
    return NextResponse.json({ error: "Anda hanya dapat membuat akun di cabang Anda sendiri" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  if (body.registration_id) {
    const { data: existingReg } = await db
      .from("registrations")
      .select("id, status, student_id")
      .eq("id", body.registration_id)
      .single();
    if (existingReg?.student_id) {
      return NextResponse.json(
        { error: "Pendaftaran ini sudah disetujui sebelumnya dan sudah punya akun student.", code: "ALREADY_APPROVED" },
        { status: 409 }
      );
    }
  }

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
  const { data: userNo, error: userNoError } = await db.rpc("generate_user_no", { p_role: role });
  if (userNoError || !userNo) {
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: userNoError?.message ?? "Gagal membuat nomor akun" }, { status: 500 });
  }

  // Profile row: try insert first. If trigger already created a minimal row,
  // fall back to an explicit update so all fields (branch_id, role, etc.) are set.
  const profileData = {
    id: userId,
    role: role as "owner" | "admin" | "manager_center" | "coach" | "student" | "school" | "staff",
    full_name,
    email,
    phone: phone || null,
    branch_id: branch_id || null,
    birth_date: body.birth_date || null,
    gender: body.gender || null,
    address: body.address || null,
    health_notes: body.health_notes || null,
    bank_name: body.bank_name || null,
    bank_account: body.bank_account || null,
    bank_holder: body.bank_holder || null,
    is_profile_complete: false,
    ...(role !== "student" ? { user_no: userNo } : {}),
    ...(role === "staff" || role === "admin" || role === "manager_center" ? { custom_role_label: body.custom_role_label || null } : {}),
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

  // For students: explicitly insert students row (no DB trigger for this),
  // then optionally assign to a class.
  let studentId: string | null = null;
  if (role === "student") {
    if (!branch_id) {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "branch_id required for student" }, { status: 400 });
    }

    const isPrivateStudent = body.student_type === "private";
    const { data: studentRow, error: studentError } = await db
      .from("students")
      .insert({
        profile_id: userId,
        branch_id,
        type: (body.student_type ?? "reguler") as "reguler" | "private" | "school_affiliate",
        status: "active",
        school_id: body.school_id || null,
        school_grade: body.student_type === "school_affiliate" ? (body.school_grade?.trim() || null) : null,
        date_start: new Date().toISOString().split("T")[0],
        total_sessions: isPrivateStudent ? (body.total_sessions ?? null) : null,
        remaining_sessions: isPrivateStudent ? (body.total_sessions ?? null) : null,
        student_no: userNo,
      })
      .select("id")
      .single();

    if (studentError) {
      await db.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    studentId = studentRow?.id ?? null;

    if (body.class_id && studentRow) {
      const { data: classRow } = await db.from("classes").select("capacity").eq("id", body.class_id).single();
      const { count: enrolledCount } = await db
        .from("student_classes")
        .select("student_id", { count: "exact", head: true })
        .eq("class_id", body.class_id);
      const capacity = classRow?.capacity ?? 0;
      if (capacity > 0 && (enrolledCount ?? 0) >= capacity) {
        // Student account is already created — don't roll it back over a full
        // class, just leave them unassigned so the admin can pick another
        // class/schedule instead of losing the whole registration.
        return NextResponse.json({
          user_id: userId,
          student_id: studentId,
          class_assignment_error: "Kelas sudah penuh — student dibuat tanpa penugasan kelas. Silakan tetapkan kelas lain secara manual.",
        });
      }
      await db.from("student_classes").insert({
        student_id: studentRow.id,
        class_id: body.class_id,
        joined_at: new Date().toISOString(),
      });
    }
  }

  // Approving a public registration: close it out in the same request as
  // account creation so the two never drift out of sync (previously this was
  // a separate client-side update that could fail independently, leaving an
  // account created but the registration stuck "pending").
  if (body.registration_id && role === "student") {
    await db.from("registrations").update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      proof_url: body.proof_url ?? undefined,
      student_id: studentId,
    }).eq("id", body.registration_id);
  }

  // For admin/manager_center accounts: optionally auto-create a paired staff account
  let staffWarning: string | null = null;
  let staffUserId: string | null = null;
  if ((role === "admin" || role === "manager_center") && body.auto_staff?.email && body.auto_staff?.password) {
    const staffName = body.auto_staff.full_name?.trim() || `Staff - ${full_name}`;
    const { data: staffAuth, error: staffAuthError } = await db.auth.admin.createUser({
      email: body.auto_staff.email,
      password: body.auto_staff.password,
      email_confirm: true,
      user_metadata: { full_name: staffName, role: "staff", branch_id, phone },
    });

    if (staffAuthError) {
      staffWarning = `Admin berhasil dibuat. Akun Staff gagal: ${staffAuthError.message}`;
    } else {
      staffUserId = staffAuth.user.id;
      const { data: staffNo } = await db.rpc("generate_user_no", { p_role: "staff" });
      const staffProfile = {
        id: staffAuth.user.id,
        role: "staff" as const,
        full_name: staffName,
        email: body.auto_staff.email,
        phone: phone || null,
        branch_id: branch_id || null,
        is_profile_complete: false,
        user_no: staffNo,
        custom_role_label: null,
        linked_admin_id: userId,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: staffInsertError } = await db.from("profiles").insert(staffProfile as any);
      if (staffInsertError) {
        if (staffInsertError.code === "23505") {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, ...staffUpdateData } = staffProfile;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.from("profiles").update(staffUpdateData as any).eq("id", staffAuth.user.id);
        } else {
          staffWarning = `Admin berhasil dibuat. Profil Staff gagal disimpan: ${staffInsertError.message}`;
        }
      }
    }
  }

  return NextResponse.json({
    user_id: userId,
    student_id: studentId,
    staff_user_id: staffUserId,
    ...(staffWarning ? { staff_warning: staffWarning } : {}),
  });
}
