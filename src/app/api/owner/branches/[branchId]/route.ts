/**
 * DELETE /api/owner/branches/[branchId]
 *
 * Menghapus cabang secara permanen beserta semua auth.users yang terkait.
 * Urutan operasi:
 *   1. Ambil semua profile_id yang branch_id = branchId (coach, member, admin, school)
 *   2. Hapus semua auth.users tersebut via admin SDK
 *   3. Hapus row branches — CASCADE di DB akan bersihkan semua data terkait
 *
 * Hanya bisa dipanggil oleh owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;

  // Verifikasi caller adalah owner
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  // 1. Ambil semua profile_id yang terkait dengan cabang ini
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id")
    .eq("branch_id", branchId);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // 2. Hapus semua auth.users — lakukan secara paralel
  const userIds = (profiles ?? []).map((p) => p.id);
  if (userIds.length > 0) {
    const deleteResults = await Promise.allSettled(
      userIds.map((id) => db.auth.admin.deleteUser(id))
    );

    // Log kegagalan tapi jangan batalkan — data DB tetap dihapus
    const failures = deleteResults
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);
    if (failures.length > 0) {
      console.error(`[delete-branch] Gagal hapus ${failures.length} auth user:`, failures);
    }
  }

  // 3. Hapus cabang — CASCADE di DB bersihkan semua tabel terkait
  const { error: deleteError } = await db
    .from("branches")
    .delete()
    .eq("id", branchId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted_auth_users: userIds.length,
  });
}
