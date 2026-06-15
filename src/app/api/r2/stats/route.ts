/**
 * GET /api/r2/stats
 * Returns storage usage breakdown by prefix from Cloudflare R2.
 * Auth: owner only (checked via user_metadata.role).
 * Cached 5 minutes via Cache-Control header.
 */
import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/utils/r2/client";
import { createClient } from "@/utils/supabase/server";

const PREFIXES = [
  { prefix: "avatars/",     label: "Avatar Profil",   icon: "user"    },
  { prefix: "logos/",       label: "Logo Cabang",      icon: "pin"     },
  { prefix: "classes/",     label: "Foto Kelas",       icon: "swim"    },
  { prefix: "attendances/", label: "Selfie Absensi",   icon: "camera"  },
  { prefix: "payments/",    label: "Bukti Pembayaran", icon: "wallet"  },
  { prefix: "certs/",       label: "Sertifikat Coach", icon: "shield"  },
  { prefix: "invoices/",    label: "Invoice PDF",      icon: "invoice" },
  { prefix: "rapors/",      label: "Rapor PDF",        icon: "book"    },
  { prefix: "qrcodes/",     label: "QR Code Member",   icon: "qr"      },
];

async function listAllObjects(prefix: string): Promise<{ key: string; size: number }[]> {
  const objects: { key: string; size: number }[] = [];
  let token: string | undefined;
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
      if (obj.Key && obj.Size !== undefined) {
        objects.push({ key: obj.Key, size: obj.Size });
      }
    }
    token = res.NextContinuationToken;
  } while (token);
  return objects;
}

export async function GET() {
  // Auth: owner only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Query all prefixes in parallel
    const results = await Promise.all(
      PREFIXES.map(async (p) => {
        const objects = await listAllObjects(p.prefix);
        const size = objects.reduce((sum, o) => sum + o.size, 0);
        return { ...p, count: objects.length, size };
      })
    );

    // Sort by size descending
    results.sort((a, b) => b.size - a.size);

    const totalSize  = results.reduce((sum, r) => sum + r.size, 0);
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json(
      { categories: results, totalSize, totalCount, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[/api/r2/stats]", err);
    return NextResponse.json({ error: "Gagal membaca R2 bucket" }, { status: 500 });
  }
}
