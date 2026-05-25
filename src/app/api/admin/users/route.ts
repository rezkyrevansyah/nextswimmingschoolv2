/**
 * POST /api/admin/users
 * Body: { email, password, full_name, role, branch_id?, phone? }
 * Creates a Supabase auth user + profile row.
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

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
  };

  const { email, password, full_name, role, branch_id, phone } = body;
  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Missing required fields: email, password, full_name, role" }, { status: 400 });
  }

  // Admins can only create coach/member — not admin/owner
  if (callerRole === "admin" && !["coach", "member"].includes(role)) {
    return NextResponse.json({ error: "Admin can only create coach or member accounts" }, { status: 403 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, branch_id, phone },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ user_id: authData.user.id });
}
