/**
 * POST /api/rapor/pdf
 * Body: PrintStudent (JSON)
 * Returns: application/pdf — a real PDF download, 595×842px (A4 portrait)
 *
 * Strategy:
 *   - Server reads all SVG/PNG assets from /public/ as data URIs → no network
 *     requests inside headless Chromium (avoids CORS / timing issues)
 *   - avatar_url and coach_signature_url (Supabase Storage URLs) are fetched
 *     server-side and converted to base64 data URIs before passing to Puppeteer
 *   - Puppeteer-core + @sparticuz/chromium-min for serverless/Vercel compatibility
 *   - CHROMIUM_PATH env var for local dev (point to system Chrome/Edge)
 *   - Vercel: set CHROMIUM_REMOTE_EXEC_URL to the sparticuz release tar URL
 *     e.g. https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildRaporHtmlStandalone, sanitizeFilename } from "@/lib/printRapor";
import type { PrintStudent, PrintBestTime, RaporAssets } from "@/lib/printRapor";
import { resolveRaporSigner, buildSchoolRaporSignatures } from "@/lib/rapor";
import type { SupabaseClient } from "@supabase/supabase-js";
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

// ── External image fetcher (for Supabase Storage URLs) ────────────────────────

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
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });

    // A4 = 210mm × 297mm. Use mm units so Puppeteer produces exact A4 pages.
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ── Server-side rapor data loader (authoritative — never trust client data) ───

/**
 * Re-derives the full rapor payload for one student/period straight from the
 * database and checks the caller is actually allowed to see it. The client
 * only ever supplies student_id + period_id — every grade, note, and
 * signature in the resulting PDF comes from this function, never from the
 * request body, so a caller cannot forge scores or signatures by hand-crafting
 * the POST payload.
 */
async function loadAuthorizedRaporStudent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  studentId: string,
  periodId: string
): Promise<{ student: PrintStudent } | { error: string; status: number }> {
  const { data: caller } = await supabase
    .from("profiles")
    .select("id, role, branch_id")
    .eq("id", userId)
    .single();
  if (!caller) return { error: "Profile not found", status: 403 };

  const { data: period } = await supabase
    .from("rapor_periods")
    .select("id, label, branch_id")
    .eq("id", periodId)
    .single();
  if (!period) return { error: "Period not found", status: 404 };

  const { data: student } = await supabase
    .from("students")
    .select(`
      id, student_no, branch_id, profile_id, school_id,
      profile:profiles(full_name, avatar_url, birth_date),
      school:schools(
        id, name, logo_url, profile_id, show_coach_sig, show_head_sig, show_school_sig, coach_sig_title, head_sig_title,
        school_signatures(id, name, title, image_url, is_active)
      ),
      student_classes(
        classes(
          id, name, rapor_signer_coach_id,
          class_coaches(coach_id, role, profile:profiles(full_name, signature_url))
        )
      ),
      rapor_entries(
        id, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id,
        rapor_levels(id, name, rapor_level_criteria(id, label, kind, options, sort_order), rapor_level_strokes(name, sort_order), rapor_level_distances(distance, sort_order))
      )
    `)
    .eq("id", studentId)
    .single();
  if (!student) return { error: "Student not found", status: 404 };

  const m = student as unknown as {
    id: string; student_no: string | null; branch_id: string; profile_id: string; school_id: string | null;
    profile: { full_name: string; avatar_url: string | null; birth_date: string | null } | null;
    school: { id: string; name: string; logo_url: string | null; profile_id: string | null; show_coach_sig?: boolean; show_head_sig?: boolean; show_school_sig?: boolean; coach_sig_title?: string; head_sig_title?: string; school_signatures?: { name: string; title: string; image_url: string; is_active: boolean }[] } | null;
    student_classes: { classes: { id: string; name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } | null }[];
    rapor_entries: { id: string; scores: Record<string, number | string>; notes: string | null; personality: string | null; motivation: string | null; learning_achievements: string | null; level: string | null; period_id: string; rapor_levels: { id: string; name: string; rapor_level_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[]; rapor_level_strokes: { name: string; sort_order: number }[]; rapor_level_distances: { distance: number; sort_order: number }[] } | null }[];
  };

  const cls = m.student_classes?.[0]?.classes ?? null;
  const isAssignedCoach = !!cls?.class_coaches?.some(cc => cc.coach_id === userId);

  // Authorization: who may view/print this student's rapor.
  const authorized =
    caller.role === "owner" ||
    (caller.role === "admin" && caller.branch_id === m.branch_id) ||
    (caller.role === "coach" && isAssignedCoach) ||
    (caller.role === "school" && m.school_id && m.school?.profile_id === userId) ||
    (caller.role === "student" && m.profile_id === userId);
  if (!authorized) return { error: "Forbidden", status: 403 };

  const entry = m.rapor_entries.find(e => e.period_id === periodId) ?? null;
  const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);

  const { data: btRows } = await supabase
    .from("student_best_times")
    .select("stroke, distance, time_seconds")
    .eq("student_id", studentId)
    .eq("branch_id", m.branch_id);
  const bestTimes: PrintBestTime[] = ((btRows ?? []) as { stroke: string; distance: number; time_seconds: number }[])
    .map(r => ({ stroke: r.stroke, distance: r.distance, time_seconds: r.time_seconds }));

  const { data: ownerSettings } = await supabase.from("owner_settings").select("*").eq("id", "default").maybeSingle();

  const criteria = [...(entry?.rapor_levels?.rapor_level_criteria ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(c => ({ id: c.id, label: c.label, kind: c.kind as "score_10" | "score_100" | "choice" | "text" }));
  const levelStrokes = [...(entry?.rapor_levels?.rapor_level_strokes ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(s => s.name);
  const levelDistances = [...(entry?.rapor_levels?.rapor_level_distances ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(d => d.distance);
  const coachSig = signer?.signature_url ?? null;
  const signatures = buildSchoolRaporSignatures(m.school, signer?.full_name ?? "—", coachSig, ownerSettings);

  return {
    student: {
      full_name: m.profile?.full_name ?? "—",
      student_no: m.student_no,
      birth_date: m.profile?.birth_date,
      avatar_url: m.profile?.avatar_url,
      class_name: cls?.name ?? "—",
      coach_name: signer?.full_name ?? "—",
      coach_signature_url: coachSig,
      school_logo_url: m.school?.logo_url ?? null,
      signatures,
      period_label: period.label,
      scores: entry?.scores ?? {},
      notes: entry?.notes ?? null,
      personality: entry?.personality ?? null,
      motivation: entry?.motivation ?? null,
      learning_achievements: entry?.learning_achievements ?? null,
      criteria,
      best_times: bestTimes,
      level_strokes: levelStrokes,
      level_distances: levelDistances,
      level: entry?.level ?? null,
    },
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: only logged-in users can generate PDFs
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PrintStudent;
  try {
    body = await req.json() as PrintStudent;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.student_id || !body.period_id) {
    return NextResponse.json({ error: "student_id and period_id are required" }, { status: 400 });
  }

  const result = await loadAuthorizedRaporStudent(supabase, user.id, body.student_id, body.period_id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const student = result.student;

  let pdfBuffer: Buffer;
  try {
    const assets = buildAssets();

    // Resolve external storage URLs to data URIs so Puppeteer doesn't need network access.
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

  const safeName = sanitizeFilename(student.full_name);

  return new NextResponse(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapor-${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
