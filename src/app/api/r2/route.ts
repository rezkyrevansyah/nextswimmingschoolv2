/**
 * GET /api/r2?key=avatars/xxx/avatar.jpg
 * Proxies R2 objects to the browser via presigned URL redirect.
 * Handles legacy avatar_url values stored as /api/r2?key=... in the database.
 * No auth required — keys are UUID-based and not guessable.
 */
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/utils/r2/client";

const ALLOWED_PREFIXES = ["avatars/", "logos/", "classes/", "certs/", "payments/", "attendances/"];

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  if (!ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
      { expiresIn: 3600 }
    );
    // Redirect browser directly to presigned URL — faster, no server buffering
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[/api/r2] Failed to generate presigned URL:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
