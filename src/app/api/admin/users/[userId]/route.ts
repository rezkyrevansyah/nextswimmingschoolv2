/**
 * PATCH /api/admin/users/[userId]  — reset password or update metadata
 * DELETE /api/admin/users/[userId] — delete user
 * Only callable by admin or owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import type { Database } from "@/types/database";

async function checkCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let role = user.user_metadata?.role as string | undefined;
  if (!role) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = prof?.role ?? undefined;
  }
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
    email?: string;
    password?: string;
    user_metadata?: Record<string, unknown>;
    profile?: Record<string, unknown>;
  };

  // Update profiles table (bypasses RLS via service key)
  if (body.profile) {
    const { error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .update(body.profile as unknown as Database["public"]["Tables"]["profiles"]["Update"])
      .eq("id", userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Update auth user (email / password / metadata)
  const authUpdates: { email?: string; password?: string; user_metadata?: Record<string, unknown> } = {};
  if (body.email) authUpdates.email = body.email;
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
    // Verify user exists first
    const { data: existingUser, error: lookupError } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    if (lookupError || !existingUser?.user) {
      console.error("[patch-user] user not found:", userId, lookupError);
      return NextResponse.json({ error: `User tidak ditemukan (id: ${userId})` }, { status: 404 });
    }

    // Pre-check email uniqueness via profiles table (faster than waiting for auth error)
    if (authUpdates.email) {
      const { data: emailConflict } = await getSupabaseAdmin()
        .from("profiles")
        .select("id")
        .eq("email", authUpdates.email)
        .neq("id", userId)
        .maybeSingle();
      if (emailConflict) {
        return NextResponse.json(
          { error: `Email "${authUpdates.email}" sudah digunakan akun lain. Gunakan email lain.`, code: "EMAIL_TAKEN" },
          { status: 409 }
        );
      }
    }

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, authUpdates);
    if (error) {
      console.error("[patch-user] auth update error:", JSON.stringify(error));
      const msg = error.message.toLowerCase();
      const isEmailTaken =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("email address is already") ||
        msg.includes("duplicate") ||
        msg.includes("email already") ||
        msg.includes("already exists");
      if (isEmailTaken && authUpdates.email) {
        return NextResponse.json(
          { error: `Email "${authUpdates.email}" sudah terdaftar. Gunakan email lain.`, code: "EMAIL_TAKEN" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Sync email ke profiles table juga
    if (authUpdates.email) {
      await getSupabaseAdmin().from("profiles").update({ email: authUpdates.email }).eq("id", userId);
    }
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

  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
