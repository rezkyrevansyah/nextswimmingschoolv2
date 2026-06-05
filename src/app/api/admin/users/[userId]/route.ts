/**
 * PATCH /api/admin/users/[userId]  — reset password or update metadata
 * DELETE /api/admin/users/[userId] — delete user
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import type { Database } from "@/types/database";

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
  const body = await req.json() as {
    password?: string;
    user_metadata?: Record<string, unknown>;
    profile?: Record<string, unknown>;
  };

  // Update profiles table (bypasses RLS via service key)
  if (body.profile) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(body.profile as unknown as Database["public"]["Tables"]["profiles"]["Update"])
      .eq("id", userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Update auth user (password / metadata)
  const authUpdates: { password?: string; user_metadata?: Record<string, unknown> } = {};
  if (body.password) authUpdates.password = body.password;
  if (body.user_metadata) authUpdates.user_metadata = body.user_metadata;

  // Also sync branch_id in auth metadata if profile update includes it
  if (body.profile?.branch_id !== undefined) {
    authUpdates.user_metadata = {
      ...(body.user_metadata ?? {}),
      branch_id: body.profile.branch_id,
      ...(body.profile.full_name ? { full_name: body.profile.full_name } : {}),
    };
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

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
