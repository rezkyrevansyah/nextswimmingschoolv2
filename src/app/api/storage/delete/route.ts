/**
 * POST /api/storage/delete
 * Body: JSON { items: { bucket: "next-storage" | "next-storage-private"; key: string; dbRef?: { table: string; column: string; id: string } }[] }
 * Returns: { deleted: number, failed: { key: string; error: string }[] }
 *
 * Owner only. Bulk-deletes storage objects (batched per bucket) and, for
 * DB-tracked files, nulls out the referencing column so no dangling
 * reference to a deleted file remains.
 */
import { NextRequest, NextResponse } from "next/server";
import { storage, BUCKET_PUBLIC, BUCKET_PRIVATE } from "@/utils/supabase-storage/client";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdmin } from "@/utils/supabase/admin";

const ALLOWED_TABLES: Record<string, string[]> = {
  profiles: ["avatar_url"],
  branches: ["logo_url"],
  classes: ["photo_url"],
  bills: ["proof_url"],
  certifications: ["photo_url"],
};

interface DeleteItem {
  bucket: typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE;
  key: string;
  dbRef?: { table: string; column: string; id: string };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { items?: DeleteItem[] };
  const items = body.items ?? [];
  if (items.length === 0) return NextResponse.json({ error: "Tidak ada file dipilih" }, { status: 400 });

  const failed: { key: string; error: string }[] = [];
  const admin = getSupabaseAdmin();

  const byBucket = new Map<typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE, DeleteItem[]>();
  for (const item of items) {
    if (item.bucket !== BUCKET_PUBLIC && item.bucket !== BUCKET_PRIVATE) {
      failed.push({ key: item.key, error: "Bucket tidak valid" });
      continue;
    }
    const list = byBucket.get(item.bucket) ?? [];
    list.push(item);
    byBucket.set(item.bucket, list);
  }

  let deleted = 0;
  for (const [bucket, bucketItems] of byBucket) {
    const { error } = await storage().from(bucket).remove(bucketItems.map(i => i.key));
    if (error) {
      for (const item of bucketItems) failed.push({ key: item.key, error: error.message });
      continue;
    }
    deleted += bucketItems.length;

    for (const item of bucketItems) {
      if (!item.dbRef) continue;
      const { table, column, id } = item.dbRef;
      const allowedColumns = ALLOWED_TABLES[table];
      if (!allowedColumns || !allowedColumns.includes(column)) continue;
      // `table`/`column` are validated against ALLOWED_TABLES just above, but
      // the Supabase client's generated types can't express a dynamic table
      // name — cast is safe because both are allowlist-checked, not raw input.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from(table as any) as any).update({ [column]: null }).eq("id", id);
    }
  }

  return NextResponse.json({ deleted, failed });
}
