/**
 * POST /api/rapor/pdf
 * Body: PrintStudent (JSON)
 * Returns: application/pdf — a real PDF download, 595×842px (A4 portrait)
 *
 * Strategy:
 *   - Server reads all SVG/PNG assets from /public/ as data URIs → no network
 *     requests inside headless Chromium (avoids CORS / timing issues)
 *   - avatar_url and coach_signature_url (R2 CDN URLs) are fetched server-side
 *     and converted to base64 data URIs before passing to Puppeteer
 *   - Puppeteer-core + @sparticuz/chromium-min for serverless/Vercel compatibility
 *   - CHROMIUM_PATH env var for local dev (point to system Chrome/Edge)
 *   - Vercel: set CHROMIUM_REMOTE_EXEC_URL to the sparticuz release tar URL
 *     e.g. https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildRaporHtmlStandalone } from "@/lib/printRapor";
import type { PrintStudent, RaporAssets } from "@/lib/printRapor";
import path from "path";
import fs from "fs";

// ── Asset helpers ─────────────────────────────────────────────────────────────

const ASSET_DIR = path.join(process.cwd(), "public", "rapor");
const PUBLIC_DIR = path.join(process.cwd(), "public");

function svgDataUri(filename: string): string {
  const content = fs.readFileSync(path.join(ASSET_DIR, filename), "utf-8");
  return `data:image/svg+xml;base64,${Buffer.from(content).toString("base64")}`;
}

function pngDataUri(filePath: string): string {
  const content = fs.readFileSync(path.join(PUBLIC_DIR, filePath));
  return `data:image/png;base64,${content.toString("base64")}`;
}

function buildAssets(): RaporAssets {
  return {
    assetTR:    svgDataUri("assets_1.svg"),
    assetBL:    svgDataUri("assets_2.svg"),
    watermark:  svgDataUri("logo_next_circle_1.svg"),
    logoHeader: pngDataUri("logo_next_persegipanjang.png"), // PNG asli — crisp, bukan SVG
    profilePh:  svgDataUri("profile_placeholder.svg"),
    coachSigPh: svgDataUri("coach_signature_placeholder.svg"),
    syahrilSig: svgDataUri("signature.svg"),
    igIcon:     svgDataUri("instagram_logo.svg"),
    emailIcon:  svgDataUri("email_logo.svg"),
  };
}

// ── External image fetcher (for R2 CDN URLs) ──────────────────────────────────

/**
 * Fetch an external image URL and return it as a base64 data URI.
 * Puppeteer in serverless cannot load external URLs — all images must be data URIs.
 * Returns null on failure; the template will fall back to placeholder.
 */
async function imageToDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

// ── PDF generation ────────────────────────────────────────────────────────────

async function generatePdf(html: string): Promise<Buffer> {
  // Dynamic imports to avoid bundling issues
  const puppeteer = await import("puppeteer-core");

  let executablePath: string;

  if (process.env.CHROMIUM_PATH) {
    // Local dev: use system Chrome / Edge
    executablePath = process.env.CHROMIUM_PATH;
  } else {
    // Serverless / Vercel: download chromium via sparticuz
    const remoteUrl =
      process.env.CHROMIUM_REMOTE_EXEC_URL ??
      "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar";
    const chromium = await import("@sparticuz/chromium-min");
    executablePath = await chromium.default.executablePath(remoteUrl);
  }

  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    // All assets are data URIs — no network needed, so "load" is sufficient
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      width: "595px",
      height: "842px",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: only logged-in users can generate PDFs
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let student: PrintStudent;
  try {
    student = await req.json() as PrintStudent;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  try {
    const assets = buildAssets();

    // Resolve external R2 URLs to data URIs so Puppeteer doesn't need network access.
    // Fetch avatar and signature in parallel; fall back to null (template uses placeholder).
    const [avatarDataUri, sigDataUri] = await Promise.all([
      student.avatar_url ? imageToDataUri(student.avatar_url) : Promise.resolve(null),
      student.coach_signature_url ? imageToDataUri(student.coach_signature_url) : Promise.resolve(null),
    ]);

    const resolvedStudent: PrintStudent = {
      ...student,
      avatar_url: avatarDataUri,
      coach_signature_url: sigDataUri,
    };

    const html = buildRaporHtmlStandalone(resolvedStudent, assets);
    pdfBuffer = await generatePdf(html);
  } catch (err) {
    console.error("[/api/rapor/pdf] PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: String(err) },
      { status: 500 }
    );
  }

  const safeName = student.full_name
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .replace(/_+/g, "_")
    .slice(0, 50);

  return new NextResponse(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapor-${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
