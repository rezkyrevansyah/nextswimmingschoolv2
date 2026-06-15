/**
 * GET /api/r2/backup-list?category=all|avatars|logos|classes|payments|certs|attendances|qrcodes
 * Returns a list of R2 file keys with labels for backup/download.
 * - For DB-tracked categories (avatars, logos, classes, payments, certs): queries Supabase.
 * - For non-tracked categories (attendances, qrcodes): lists directly from R2.
 * Auth: owner only.
 */
import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/utils/r2/client";
import { createClient } from "@/utils/supabase/server";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

function extractKey(url: string): string | null {
  if (!url) return null;
  // Stored as full CDN URL: https://cdn.example.com/avatars/xxx/avatar.jpg
  if (url.startsWith("http") && R2_PUBLIC_URL) {
    const key = url.replace(R2_PUBLIC_URL + "/", "").split("?")[0];
    return key || null;
  }
  // Stored as /api/r2?key=... legacy format
  try {
    const u = new URL(url, "http://localhost");
    const k = u.searchParams.get("key");
    return k || null;
  } catch {
    return null;
  }
}

async function listR2Prefix(prefix: string): Promise<{ key: string; label: string; category: string }[]> {
  const items: { key: string; label: string; category: string }[] = [];
  let token: string | undefined;
  const categoryMap: Record<string, string> = {
    "attendances/": "Selfie Absensi",
    "qrcodes/":     "QR Code Member",
  };
  const cat = categoryMap[prefix] ?? prefix;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      const filename = obj.Key.split("/").filter(Boolean).pop() ?? obj.Key;
      items.push({ key: obj.Key, label: filename, category: cat });
    }
    token = res.NextContinuationToken;
  } while (token);
  return items;
}

export async function GET(req: NextRequest) {
  // Auth: owner only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const category = req.nextUrl.searchParams.get("category") ?? "all";

  const files: { key: string; label: string; category: string; url: string }[] = [];

  try {
    // ── DB-backed categories ────────────────────────────────────────────────
    if (category === "all" || category === "avatars") {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .not("avatar_url", "is", null);
      for (const row of data ?? []) {
        if (!row.avatar_url) continue;
        const key = extractKey(row.avatar_url);
        if (!key) continue;
        files.push({
          key,
          label: `${row.full_name ?? row.id} — avatar`,
          category: "Avatar Profil",
          url: `${R2_PUBLIC_URL}/${key}`,
        });
      }
    }

    if (category === "all" || category === "logos") {
      const { data } = await supabase
        .from("branches")
        .select("id, name, logo_url")
        .not("logo_url", "is", null);
      for (const row of data ?? []) {
        if (!row.logo_url) continue;
        const key = extractKey(row.logo_url);
        if (!key) continue;
        files.push({
          key,
          label: `Cabang ${row.name} — logo`,
          category: "Logo Cabang",
          url: `${R2_PUBLIC_URL}/${key}`,
        });
      }
    }

    if (category === "all" || category === "classes") {
      const { data } = await supabase
        .from("classes")
        .select("id, name, photo_url")
        .not("photo_url", "is", null);
      for (const row of data ?? []) {
        if (!row.photo_url) continue;
        const key = extractKey(row.photo_url);
        if (!key) continue;
        files.push({
          key,
          label: `Kelas ${row.name} — foto`,
          category: "Foto Kelas",
          url: `${R2_PUBLIC_URL}/${key}`,
        });
      }
    }

    if (category === "all" || category === "payments") {
      const { data } = await supabase
        .from("bills")
        .select("id, period_label, proof_url, member_id")
        .not("proof_url", "is", null);
      for (const row of data ?? []) {
        if (!row.proof_url) continue;
        const key = extractKey(row.proof_url);
        if (!key) continue;
        files.push({
          key,
          label: `Bukti bayar ${row.period_label} (bill ${row.id.slice(0, 8)})`,
          category: "Bukti Pembayaran",
          url: `${R2_PUBLIC_URL}/${key}`,
        });
      }
    }

    if (category === "all" || category === "certs") {
      const { data } = await supabase
        .from("certifications")
        .select("id, name, title, photo_url, coach_id")
        .not("photo_url", "is", null);
      for (const row of data ?? []) {
        if (!row.photo_url) continue;
        const key = extractKey(row.photo_url);
        if (!key) continue;
        files.push({
          key,
          label: `Sertifikat: ${row.title ?? row.name}`,
          category: "Sertifikat Coach",
          url: `${R2_PUBLIC_URL}/${key}`,
        });
      }
    }

    // ── R2-direct categories (no DB record for URLs) ────────────────────────
    if (category === "all" || category === "attendances") {
      const items = await listR2Prefix("attendances/");
      for (const item of items) {
        files.push({ ...item, url: `${R2_PUBLIC_URL}/${item.key}` });
      }
    }

    if (category === "all" || category === "qrcodes") {
      const items = await listR2Prefix("qrcodes/");
      for (const item of items) {
        files.push({ ...item, url: `${R2_PUBLIC_URL}/${item.key}` });
      }
    }

    return NextResponse.json({ files, total: files.length });
  } catch (err) {
    console.error("[/api/r2/backup-list]", err);
    return NextResponse.json({ error: "Gagal memuat daftar file" }, { status: 500 });
  }
}
