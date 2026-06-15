/**
 * GET /api/r2?key=avatars/xxx/avatar.jpg
 * Proxies R2 objects to the browser.
 * - For normal browser navigation (images, links): redirect to presigned URL (fast, no buffering)
 * - For fetch() calls with Accept header (backup download): stream blob through server to avoid CORS
 * No auth required — keys are UUID-based and not guessable.
 */
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/utils/r2/client";

const ALLOWED_PREFIXES = ["avatars/", "logos/", "classes/", "certs/", "payments/", "attendances/", "qrcodes/"];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  if (!ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Detect fetch() calls (backup download) vs normal browser navigation.
    // fetch() sets Sec-Fetch-Mode: cors or has no Origin when same-site.
    // Safest heuristic: if caller explicitly requests blob via ?stream=1, or
    // if the request has Sec-Fetch-Dest: empty (fetch API default).
    const secFetchDest = req.headers.get("sec-fetch-dest");
    const wantsStream  = req.nextUrl.searchParams.get("stream") === "1" || secFetchDest === "empty";

    if (wantsStream) {
      // Proxy the object bytes through this server — no CORS issue
      const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
      const obj = await r2.send(cmd);
      if (!obj.Body) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const contentType  = obj.ContentType ?? "application/octet-stream";
      const bytes = await obj.Body.transformToByteArray();
      const arrayBuffer = bytes.buffer as ArrayBuffer;

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
        },
      });
    }

    // Normal browser navigation — redirect to presigned URL (faster, no server buffering)
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: 3600 }
    );
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[/api/r2] Failed:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
