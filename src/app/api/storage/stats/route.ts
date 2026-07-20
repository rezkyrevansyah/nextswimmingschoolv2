/**
 * GET /api/storage/stats
 * Returns storage usage breakdown by prefix across both Supabase Storage buckets.
 * Auth: owner only (checked via user_metadata.role).
 * Cached 5 minutes via Cache-Control header.
 */
import { NextResponse } from "next/server";
import { storage, BUCKET_PUBLIC, BUCKET_PRIVATE } from "@/utils/supabase-storage/client";
import { createClient } from "@/utils/supabase/server";

const PREFIXES: { bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE; prefix: string; label: string; icon: string }[] = [
  { bucket: BUCKET_PUBLIC,  prefix: "avatars",     label: "Avatar Profil",   icon: "user"   },
  { bucket: BUCKET_PUBLIC,  prefix: "logos",       label: "Logo Cabang",     icon: "pin"    },
  { bucket: BUCKET_PUBLIC,  prefix: "classes",     label: "Foto Kelas",      icon: "swim"   },
  { bucket: BUCKET_PUBLIC,  prefix: "signatures",  label: "Tanda Tangan",    icon: "edit"   },
  { bucket: BUCKET_PUBLIC,  prefix: "landing",     label: "Konten Landing",  icon: "grid"   },
  { bucket: BUCKET_PRIVATE, prefix: "attendances", label: "Selfie Absensi",  icon: "camera" },
  { bucket: BUCKET_PRIVATE, prefix: "payments",    label: "Bukti Pembayaran", icon: "wallet" },
  { bucket: BUCKET_PRIVATE, prefix: "certs",       label: "Sertifikat Coach", icon: "shield" },
];

async function listAllObjects(bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE, prefix: string): Promise<{ key: string; size: number }[]> {
  const objects: { key: string; size: number }[] = [];

  async function walk(currentPrefix: string) {
    const { data } = await storage().from(bucket).list(currentPrefix, { limit: 1000 });
    for (const obj of data ?? []) {
      const fullPath = `${currentPrefix}/${obj.name}`;
      if (obj.id === null) {
        // Folder (no id) — recurse.
        await walk(fullPath);
      } else {
        objects.push({ key: fullPath, size: obj.metadata?.size ?? 0 });
      }
    }
  }

  await walk(prefix);
  return objects;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const results = await Promise.all(
      PREFIXES.map(async (p) => {
        const objects = await listAllObjects(p.bucket, p.prefix);
        const size = objects.reduce((sum, o) => sum + o.size, 0);
        return { prefix: p.prefix, label: p.label, icon: p.icon, count: objects.length, size };
      })
    );

    results.sort((a, b) => b.size - a.size);

    const totalSize = results.reduce((sum, r) => sum + r.size, 0);
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json(
      { categories: results, totalSize, totalCount, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[/api/storage/stats]", err);
    return NextResponse.json({ error: "Gagal membaca storage bucket" }, { status: 500 });
  }
}
