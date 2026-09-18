/**
 * POST /api/admin/import-students
 * Body: { branch_id: string, rows: ImportStudentRow[] }
 * Bulk-creates students sequentially to avoid Supabase auth rate limits.
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

interface ImportStudentRow {
  email: string;
  password: string;
  full_name: string;
  student_type?: "reguler" | "private" | "school_affiliate";
  birth_date?: string;
  gender?: string;
  phone?: string;
  address?: string;
  health_notes?: string;
  total_sessions?: number | null;
  class_id?: string | null;
  school_id?: string | null;
  school_grade?: string | null;
  // Private-only — a private student always gets its own dedicated 1:1 class,
  // always at this branch's own pool (location_type: "branch").
  package_price?: number | null;
  schedule_days?: string[] | null;
  time_start?: string | null;
  time_end?: string | null;
  head_coach_id?: string | null;
  assistant_coach_ids?: string[] | null;
}

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

  const body = await req.json() as { branch_id?: string; rows?: ImportStudentRow[] };
  const { branch_id, rows } = body;

  if (!branch_id) {
    return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
  }
  if (callerRole === "admin" && branch_id !== callerBranchId) {
    return NextResponse.json({ error: "Anda hanya dapat mengimpor student ke cabang Anda sendiri" }, { status: 403 });
  }
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array is required and must not be empty" }, { status: 400 });
  }
  if (rows.length > 200) {
    return NextResponse.json({ error: "Maximum 200 rows per import" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  let success = 0;
  const failed: { row: number; email: string; error: string }[] = [];
  const classWarnings: { row: number; email: string; warning: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // row 1 = header in Excel
    const isPrivate = row.student_type === "private";

    // For a private student, create their dedicated 1:1 class first — always
    // at this branch's own pool (location_type: "branch"). Rolled back below
    // if any later step in this row fails.
    let privateClassId: string | null = null;
    if (isPrivate) {
      const { data: newClass, error: classErr } = await db
        .from("classes")
        .insert({
          name: `Private - ${row.full_name}`,
          branch_id,
          class_type: "private",
          capacity: 1,
          enrolled: 0,
          status: "active",
          price_monthly: 0,
          schedule_days: row.schedule_days ?? [],
          time_start: row.time_start,
          time_end: row.time_end,
          location_type: "branch",
        })
        .select("id")
        .single();
      if (classErr || !newClass) {
        failed.push({ row: rowNum, email: row.email, error: classErr?.message ?? "Gagal membuat kelas private" });
        continue;
      }
      privateClassId = newClass.id;
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: row.email,
      password: row.password,
      email_confirm: true,
      user_metadata: { full_name: row.full_name, role: "student", branch_id, phone: row.phone },
    });

    if (authError) {
      const isEmailTaken =
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("email address is already") ||
        authError.message.toLowerCase().includes("duplicate");
      if (privateClassId) await db.from("classes").delete().eq("id", privateClassId);
      failed.push({
        row: rowNum,
        email: row.email,
        error: isEmailTaken ? `Email sudah terdaftar` : authError.message,
      });
      continue;
    }

    const userId = authData.user.id;

    // Structured account ID (NEXT.xxx.ST.yy) — atomic sequence, generated once per row.
    const { data: userNo, error: userNoError } = await db.rpc("generate_user_no", { p_role: "student" });
    if (userNoError || !userNo) {
      await db.auth.admin.deleteUser(userId);
      if (privateClassId) await db.from("classes").delete().eq("id", privateClassId);
      failed.push({ row: rowNum, email: row.email, error: userNoError?.message ?? "Gagal membuat nomor akun" });
      continue;
    }

    // 2. Insert profile (with fallback update on 23505)
    const profileData = {
      id: userId,
      role: "student" as const,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone || null,
      branch_id,
      birth_date: row.birth_date || null,
      gender: row.gender || null,
      address: row.address || null,
      health_notes: row.health_notes || null,
      is_profile_complete: false,
    };

    const { error: insertError } = await db.from("profiles").insert(profileData);
    if (insertError) {
      if (insertError.code === "23505") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...updateData } = profileData;
        const { error: updateError } = await db.from("profiles").update(updateData).eq("id", userId);
        if (updateError) {
          await db.auth.admin.deleteUser(userId);
          if (privateClassId) await db.from("classes").delete().eq("id", privateClassId);
          failed.push({ row: rowNum, email: row.email, error: updateError.message });
          continue;
        }
      } else {
        await db.auth.admin.deleteUser(userId);
        if (privateClassId) await db.from("classes").delete().eq("id", privateClassId);
        failed.push({ row: rowNum, email: row.email, error: insertError.message });
        continue;
      }
    }

    // 3. Insert students row
    const { data: studentRow, error: studentError } = await db
      .from("students")
      .insert({
        profile_id: userId,
        branch_id,
        type: row.student_type ?? "reguler",
        status: "active",
        school_id: row.student_type === "school_affiliate" ? (row.school_id ?? null) : null,
        school_grade: row.student_type === "school_affiliate" ? (row.school_grade ?? null) : null,
        date_start: new Date().toISOString().split("T")[0],
        total_sessions: isPrivate ? (row.total_sessions ?? null) : null,
        remaining_sessions: isPrivate ? (row.total_sessions ?? null) : null,
        student_no: userNo,
      })
      .select("id")
      .single();

    if (studentError) {
      await db.auth.admin.deleteUser(userId);
      if (privateClassId) await db.from("classes").delete().eq("id", privateClassId);
      failed.push({ row: rowNum, email: row.email, error: studentError.message });
      continue;
    }

    if (isPrivate && privateClassId && studentRow) {
      // 4a. Link the student to their dedicated private class (no capacity
      // check needed — it's a fresh capacity-1 class created above).
      await db.from("student_classes").insert({
        student_id: studentRow.id,
        class_id: privateClassId,
        joined_at: new Date().toISOString(),
      });

      // 4b. Assign head/assistant coach(es), re-validating they still exist
      // and are coaches (they may have been deleted since the preview step).
      // Non-fatal — the student row already exists either way.
      const candidateCoachIds = [row.head_coach_id, ...(row.assistant_coach_ids ?? [])].filter((id): id is string => !!id);
      let validCoachIds = new Set<string>();
      if (candidateCoachIds.length > 0) {
        const { data: validCoaches } = await db.from("profiles").select("id").eq("role", "coach").in("id", candidateCoachIds);
        validCoachIds = new Set((validCoaches ?? []).map(c => c.id));
      }
      const coachRows: { class_id: string; coach_id: string; role: "head" | "assistant" }[] = [];
      if (row.head_coach_id && validCoachIds.has(row.head_coach_id)) {
        coachRows.push({ class_id: privateClassId, coach_id: row.head_coach_id, role: "head" });
      }
      for (const id of row.assistant_coach_ids ?? []) {
        if (id !== row.head_coach_id && validCoachIds.has(id)) coachRows.push({ class_id: privateClassId, coach_id: id, role: "assistant" });
      }
      if (coachRows.length > 0) {
        const { error: coachErr } = await db.from("class_coaches").insert(coachRows);
        if (coachErr) classWarnings.push({ row: rowNum, email: row.email, warning: "Gagal assign coach — bisa diatur manual lewat menu Private Students" });
      }

      // 4c. Optional bill for the session package price.
      const packagePrice = row.package_price ?? 0;
      if (packagePrice > 0) {
        const { error: billErr } = await db.from("bills").insert({
          student_id: studentRow.id,
          branch_id,
          class_id: privateClassId,
          period_label: `Tambah ${row.total_sessions ?? 0} sesi`,
          type: "session_pack",
          sessions_total: row.total_sessions ?? 0,
          sessions_used: 0,
          amount: packagePrice,
          discount: 0,
          total: packagePrice,
          status: "unpaid",
        });
        if (billErr) classWarnings.push({ row: rowNum, email: row.email, warning: "Gagal membuat tagihan paket — bisa dibuat manual lewat menu Private Students" });
      }
    } else if (row.class_id && studentRow) {
      // 4. Assign to an existing class (non-fatal — student row already exists either way)
      const { data: classRow } = await db.from("classes").select("capacity").eq("id", row.class_id).single();
      const { count: enrolledCount } = await db
        .from("student_classes")
        .select("student_id", { count: "exact", head: true })
        .eq("class_id", row.class_id);
      const capacity = classRow?.capacity ?? 0;
      if (capacity > 0 && (enrolledCount ?? 0) >= capacity) {
        classWarnings.push({ row: rowNum, email: row.email, warning: "Kelas sudah penuh — student dibuat tanpa penugasan kelas" });
      } else {
        await db.from("student_classes").insert({
          student_id: studentRow.id,
          class_id: row.class_id,
          joined_at: new Date().toISOString(),
        });
      }
    }

    success++;
  }

  return NextResponse.json({ success, failed, classWarnings });
}
