/**
 * GET  /api/owner/db?table=profiles&page=1&limit=50&search=xxx&search_col=full_name
 * DELETE /api/owner/db  body: { table: string, ids: string[] }
 * Owner-only database browser — read and delete rows from allowed tables.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

const ALLOWED_TABLES = [
  "profiles", "branches", "classes", "members", "member_classes",
  "member_attendances", "coach_attendances", "staff_attendances",
  "bills", "coach_invoices", "payslips", "coach_loans",
  "rapor_entries", "rapor_periods", "announcements", "notifications",
  "activity_logs", "registrations", "trial_bookings",
  "competitions", "competition_participations",
  "manual_transactions", "manual_transaction_categories",
  "certifications", "coach_leaves", "member_leaves",
];

async function verifyOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await verifyOwner();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const search = searchParams.get("search") ?? "";
  const searchCol = searchParams.get("search_col") ?? "";

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from(table as any) as any).select("*", { count: "exact" }).range(offset, offset + limit - 1);
  if (search && searchCol) {
    query = query.ilike(searchCol, `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count });
}

export async function DELETE(req: NextRequest) {
  const user = await verifyOwner();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { table?: string; ids?: string[] };
  const { table, ids } = body;

  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Table not allowed" }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: "Max 100 deletions at once" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from(table as any) as any).delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}
