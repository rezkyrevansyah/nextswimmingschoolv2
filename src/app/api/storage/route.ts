/**
 * GET /api/storage?key=avatars/xxx/avatar.jpg
 * Proxies Supabase Storage objects to the browser.
 * - For normal browser navigation (images, links): redirect to a signed URL.
 * - For fetch() calls (backup download): stream the blob through the server.
 * No auth required — keys are UUID-based and not guessable, matching the
 * previous R2 proxy's threat model.
 */
import { NextRequest, NextResponse } from "next/server";
import { storage, BUCKET_PUBLIC, BUCKET_PRIVATE } from "@/utils/supabase-storage/client";

const PUBLIC_PREFIXES = ["avatars/", "logos/", "classes/"];
const PRIVATE_PREFIXES = ["certs/", "payments/", "attendances/"];

function bucketForKey(key: string): typeof BUCKET_PUBLIC | typeof BUCKET_PRIVATE | null {
  if (PUBLIC_PREFIXES.some((p) => key.startsWith(p))) return BUCKET_PUBLIC;
  if (PRIVATE_PREFIXES.some((p) => key.startsWith(p))) return BUCKET_PRIVATE;
  return null;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const bucket = bucketForKey(key);
  if (!bucket) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const secFetchDest = req.headers.get("sec-fetch-dest");
    const wantsStream = req.nextUrl.searchParams.get("stream") === "1" || secFetchDest === "empty";

    if (wantsStream) {
      const { data, error } = await storage().from(bucket).download(key);
      if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const arrayBuffer = await data.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": data.type || "application/octet-stream",
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
        },
      });
    }

    if (bucket === BUCKET_PUBLIC) {
      const { data } = storage().from(bucket).getPublicUrl(key);
      return NextResponse.redirect(data.publicUrl, { status: 302 });
    }

    const { data, error } = await storage().from(bucket).createSignedUrl(key, 3600);
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.redirect(data.signedUrl, {
      status: 302,
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[/api/storage] Failed:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
