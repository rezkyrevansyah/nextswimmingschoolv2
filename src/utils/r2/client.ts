/**
 * Cloudflare R2 client — server-side only.
 * Uses @aws-sdk/client-s3 (R2 is S3-compatible).
 * Never import this in "use client" components — use the upload/delete
 * Route Handlers instead.
 */
import { S3Client } from "@aws-sdk/client-s3";

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY
) {
  throw new Error(
    "Missing Cloudflare R2 env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
  );
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * Public CDN base URL for the bucket.
 * e.g. https://cdn.nextswimmingschool.com  or  https://pub-xxxx.r2.dev
 */
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
