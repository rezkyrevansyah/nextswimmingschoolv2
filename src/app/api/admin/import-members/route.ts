/**
 * POST /api/admin/import-members
 * Body: { branch_id: string, rows: ImportMemberRow[] }
 * Bulk-creates members sequentially to avoid Supabase auth rate limits.
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

interface ImportMemberRow {
  email: string;
  password: string;
  full_name: string;
  member_type?: "reguler" | "private" | "school_affiliate";
  birth_date?: string;
  gender?: string;
  phone?: string;
  address?: string;
  health_notes?: string;
  total_sessions?: number | null;
  class_id?: string | null;
  school_id?: string | null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = user.user_metadata?.role as string | undefined;
  if (!callerRole || !["admin", "owner"].includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { branch_id?: string; rows?: ImportMemberRow[] };
  const { branch_id, rows } = body;

  if (!branch_id) {
    return NextResponse.json({ error: "branch_id is required" }, { status: 400 });
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // row 1 = header in Excel

    // 1. Create auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: row.email,
      password: row.password,
      email_confirm: true,
      user_metadata: { full_name: row.full_name, role: "member", branch_id, phone: row.phone },
    });

    if (authError) {
      const isEmailTaken =
        authError.message.toLowerCase().includes("already been registered") ||
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("email address is already") ||
        authError.message.toLowerCase().includes("duplicate");
      failed.push({
        row: rowNum,
        email: row.email,
        error: isEmailTaken ? `Email sudah terdaftar` : authError.message,
      });
      continue;
    }

    const userId = authData.user.id;

    // 2. Insert profile (with fallback update on 23505)
    const profileData = {
      id: userId,
      role: "member" as const,
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
          failed.push({ row: rowNum, email: row.email, error: updateError.message });
          continue;
        }
      } else {
        await db.auth.admin.deleteUser(userId);
        failed.push({ row: rowNum, email: row.email, error: insertError.message });
        continue;
      }
    }

    // 3. Insert members row
    const isPrivate = row.member_type === "private";
    const { data: memberRow, error: memberError } = await db
      .from("members")
      .insert({
        profile_id: userId,
        branch_id,
        type: (row.member_type ?? "reguler") as "reguler" | "private" | "school_affiliate",
        status: "active",
        school_id: row.member_type === "school_affiliate" ? (row.school_id ?? null) : null,
        date_start: new Date().toISOString().split("T")[0],
        total_sessions: isPrivate ? (row.total_sessions ?? null) : null,
        remaining_sessions: isPrivate ? (row.total_sessions ?? null) : null,
      })
      .select("id")
      .single();

    if (memberError) {
      await db.auth.admin.deleteUser(userId);
      failed.push({ row: rowNum, email: row.email, error: memberError.message });
      continue;
    }

    // 4. Assign to class (non-fatal)
    if (row.class_id && memberRow) {
      await db.from("member_classes").insert({
        member_id: memberRow.id,
        class_id: row.class_id,
        joined_at: new Date().toISOString(),
      });
      // Ignore class assignment errors — member is still created successfully
    }

    success++;
  }

  return NextResponse.json({ success, failed });
}
