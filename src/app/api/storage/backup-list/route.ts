/**
 * GET /api/storage/backup-list?category=all|avatars|logos|classes|payments|certs|attendances
 * Returns a list of storage file keys with labels for backup/download.
 * - For DB-tracked categories (avatars, logos, classes): public bucket, DB column holds a full URL.
 * - For DB-tracked private categories (payments, certs): private bucket, DB column holds the raw key.
 * - For non-tracked categories (attendances): listed directly from the private bucket.
 * Auth: owner only.
 */
import { NextRequest, NextResponse } from "next/server";
import { storage, BUCKET_PUBLIC, BUCKET_PRIVATE } from "@/utils/supabase-storage/client";
import { createClient } from "@/utils/supabase/server";

function extractPublicKey(url: string): string | null {
  if (!url) return null;
  const marker = "/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const afterMarker = url.slice(idx + marker.length);
  const withoutBucket = afterMarker.split("/").slice(1).join("/");
  return withoutBucket.split("?")[0] || null;
}

interface DbRef { table: string; column: string; id: string }
interface BackupFileOut { key: string; label: string; category: string; url: string; bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE; dbRef?: DbRef }

async function listBucketPrefix(
  bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE,
  prefix: string,
  categoryLabel: string
): Promise<{ key: string; label: string; category: string; bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE }[]> {
  const items: { key: string; label: string; category: string; bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE }[] = [];
  const trimmed = prefix.replace(/\/$/, "");
  const { data } = await storage().from(bucket).list(trimmed, { limit: 1000 });
  for (const obj of data ?? []) {
    if (!obj.name) continue;
    items.push({ key: `${trimmed}/${obj.name}`, label: obj.name, category: categoryLabel, bucket });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const category = req.nextUrl.searchParams.get("category") ?? "all";
  const files: BackupFileOut[] = [];

  try {
    if (category === "all" || category === "avatars") {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").not("avatar_url", "is", null);
      for (const row of data ?? []) {
        if (!row.avatar_url) continue;
        const key = extractPublicKey(row.avatar_url);
        if (!key) continue;
        files.push({
          key, label: `${row.full_name ?? row.id} — avatar`, category: "Avatar Profil", url: row.avatar_url,
          bucket: BUCKET_PUBLIC, dbRef: { table: "profiles", column: "avatar_url", id: row.id },
        });
      }
    }

    if (category === "all" || category === "logos") {
      const { data } = await supabase.from("branches").select("id, name, logo_url").not("logo_url", "is", null);
      for (const row of data ?? []) {
        if (!row.logo_url) continue;
        const key = extractPublicKey(row.logo_url);
        if (!key) continue;
        files.push({
          key, label: `Cabang ${row.name} — logo`, category: "Logo Cabang", url: row.logo_url,
          bucket: BUCKET_PUBLIC, dbRef: { table: "branches", column: "logo_url", id: row.id },
        });
      }
    }

    if (category === "all" || category === "classes") {
      const { data } = await supabase.from("classes").select("id, name, photo_url").not("photo_url", "is", null);
      for (const row of data ?? []) {
        if (!row.photo_url) continue;
        const key = extractPublicKey(row.photo_url);
        if (!key) continue;
        files.push({
          key, label: `Kelas ${row.name} — foto`, category: "Foto Kelas", url: row.photo_url,
          bucket: BUCKET_PUBLIC, dbRef: { table: "classes", column: "photo_url", id: row.id },
        });
      }
    }

    if (category === "all" || category === "payments") {
      const { data } = await supabase.from("bills").select("id, period_label, proof_url").not("proof_url", "is", null);
      for (const row of data ?? []) {
        if (!row.proof_url) continue;
        const { data: signed } = await storage().from(BUCKET_PRIVATE).createSignedUrl(row.proof_url, 3600);
        files.push({
          key: row.proof_url,
          label: `Bukti bayar ${row.period_label} (bill ${row.id.slice(0, 8)})`,
          category: "Bukti Pembayaran",
          url: signed?.signedUrl ?? "",
          bucket: BUCKET_PRIVATE,
          dbRef: { table: "bills", column: "proof_url", id: row.id },
        });
      }
    }

    if (category === "all" || category === "certs") {
      const { data } = await supabase.from("certifications").select("id, name, title, photo_url").not("photo_url", "is", null);
      for (const row of data ?? []) {
        if (!row.photo_url) continue;
        const { data: signed } = await storage().from(BUCKET_PRIVATE).createSignedUrl(row.photo_url, 3600);
        files.push({
          key: row.photo_url,
          label: `Sertifikat: ${row.title ?? row.name}`,
          category: "Sertifikat Coach",
          url: signed?.signedUrl ?? "",
          bucket: BUCKET_PRIVATE,
          dbRef: { table: "certifications", column: "photo_url", id: row.id },
        });
      }
    }

    if (category === "all" || category === "attendances") {
      const items = await listBucketPrefix(BUCKET_PRIVATE, "attendances", "Selfie Absensi");
      for (const item of items) {
        const { data: signed } = await storage().from(BUCKET_PRIVATE).createSignedUrl(item.key, 3600);
        files.push({ ...item, url: signed?.signedUrl ?? "" });
      }
    }

    return NextResponse.json({ files, total: files.length });
  } catch (err) {
    console.error("[/api/storage/backup-list]", err);
    return NextResponse.json({ error: "Gagal memuat daftar file" }, { status: 500 });
  }
}
