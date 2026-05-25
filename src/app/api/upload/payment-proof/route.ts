/**
 * POST /api/upload/payment-proof
 * Body: multipart/form-data { file: File, billId: string }
 * Returns: { url: string }
 *
 * Admin-only. Uploads payment proof and updates bills.proof_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { uploadBuffer, keys } from "@/utils/r2/upload";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file   = form.get("file")   as File | null;
  const billId = form.get("billId") as string | null;
  if (!file || !billId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = keys.payment(billId);
  const url = await uploadBuffer(key, buffer, file.type || "image/jpeg");

  await supabase.from("bills").update({ proof_url: url }).eq("id", billId);

  return NextResponse.json({ url });
}
