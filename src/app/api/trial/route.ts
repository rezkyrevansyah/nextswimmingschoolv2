import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface TrialPayload {
  name?: string;
  phone?: string;
  age_group?: string;
  branch_id?: string | null;
  preferred_time?: string | null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as TrialPayload | null;
  const name = body?.name?.trim();
  const phone = body?.phone?.trim();

  if (!name || !phone) {
    return NextResponse.json({ error: "Nama dan nomor WhatsApp wajib diisi." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trial_bookings").insert({
    name,
    phone,
    age_group: body?.age_group ?? null,
    branch_id: body?.branch_id ?? null,
    preferred_time: body?.preferred_time ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "Gagal menyimpan data." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
