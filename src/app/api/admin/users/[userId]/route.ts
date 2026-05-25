/**
 * PATCH /api/admin/users/[userId]  — reset password or update metadata
 * DELETE /api/admin/users/[userId] — delete user
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

async function checkCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role as string | undefined;
  if (!role || !["admin", "owner"].includes(role)) return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const caller = await checkCaller();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const body = await req.json() as { password?: string; user_metadata?: Record<string, unknown> };

  const updates: { password?: string; user_metadata?: Record<string, unknown> } = {};
  if (body.password) updates.password = body.password;
  if (body.user_metadata) updates.user_metadata = body.user_metadata;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const caller = await checkCaller();
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;

  // Prevent self-deletion
  if (caller.id === userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
