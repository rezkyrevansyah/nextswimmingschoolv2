/**
 * Shared rapor print/PDF utility.
 * Reproduces the NEXT Swimming School Report Card design pixel-perfect
 * against the reference at rapor-new.svg / rapor-new.jpg.
 *
 * Assets served from /public/rapor/ (copied from /public/assets rapor/).
 * Used by: school/page.tsx, member/page.tsx, coach/page.tsx
 *
 * Two modes:
 *   1. downloadRaporPdf() — POST /api/rapor/pdf → real PDF download (server renders with Puppeteer)
 *   2. buildRaporHtmlStandalone() — exported for server-side use in the API route
 */

export interface PrintCriterion {
  id: string;
  label: string;
  kind: "score_10" | "score_100" | "choice" | "text";
}

export interface PrintBestTime {
  stroke: string;
  distance: number;
  time_seconds: number;
}

export interface PrintStudent {
  full_name: string;
  member_no?: string | null;
  class_name: string;
  level?: string | null;
  coach_name: string;
  period_label: string;
  birth_date?: string | null;
  age?: number | null;
  location?: string | null;
  avatar_url?: string | null;
  scores: Record<string, number | string>;
  notes: string | null;
  personality?: string | null;
  motivation?: string | null;
  learning_achievements?: string | null;
  attendance_rate?: number | null; // 0–100
  best_times?: PrintBestTime[];
  level_strokes?: string[];   // ordered stroke names from the member's level (rapor_level_strokes), sort_order-sorted
  level_distances?: number[]; // ordered distances from the member's level (rapor_level_distances), sort_order-sorted
  criteria?: PrintCriterion[];
  coach_signature_url?: string | null; // uploaded coach signature from Supabase Storage
}

/** All asset URIs — can be URL paths or data URIs (for server-side headless rendering) */
export interface RaporAssets {
  assetTR: string;    // decorative top-right wave
  assetBL: string;    // decorative bottom-left dots
  watermark: string;  // circle logo, opacity 0.13
  logoHeader: string; // rectangular logo top-right
  profilePh: string;  // profile placeholder avatar
  coachSigPh: string; // coach signature placeholder
  syahrilSig: string; // Syahril Sidik signature (right column)
  igIcon: string;     // instagram icon for footer
  emailIcon: string;  // email icon for footer
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format seconds (e.g. 75.34) as "1:15.34" */
export function fmtSwimTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const sPad = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
  return m > 0 ? `${m}:${sPad}` : `${sPad}`;
}

/** Map a numeric score to a label string */
function scoreLabel(val: number | string, kind: string): string {
  if (typeof val === "string") return val;
  const max = kind === "score_10" ? 10 : 100;
  const pct = (val / max) * 100;
  if (pct >= 90) return "EXCELLENT";
  if (pct >= 75) return "ADVANCE";
  if (pct >= 60) return "GOOD";
  if (pct >= 45) return "SATISFYING";
  if (pct >= 30) return "EMERGING";
  return "BEGINNING";
}

/** Sanitize a student name into a safe filename fragment (no extension). */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .replace(/_+/g, "_")
    .slice(0, 50);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function calcAgeFromDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Build asset map from origin URL (client-side use) */
function assetsFromOrigin(origin: string): RaporAssets {
  const a = (f: string) => `${origin}/rapor/${f}`;
  return {
    assetTR:    a("assets_1.svg"),
    assetBL:    a("assets_2.svg"),
    watermark:  a("logo_next_circle_1.svg"),
    logoHeader: `${origin}/logo_next_persegipanjang.png`, // PNG asli, bukan SVG
    profilePh:  a("profile_placeholder.svg"),
    coachSigPh: a("coach_signature_placeholder.svg"),
    syahrilSig: a("signature.svg"),
    igIcon:     a("instagram_logo.svg"),
    emailIcon:  a("email_logo.svg"),
  };
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Montserrat',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Page: A4 at 96dpi = 794×1123px — flexbox fills the full height ── */
  .page{width:794px;height:1123px;background:#fff;position:relative;margin:0 auto;padding:32px 76px 24px 76px;display:flex;flex-direction:column;overflow:hidden}

  /* ── Decorative assets (absolute to .page) ── */
  .deco-tr{position:absolute;top:0;right:0;width:267px;height:267px;pointer-events:none;z-index:0}
  .deco-tr img{width:100%;height:100%;object-fit:fill}
  .deco-bl{position:absolute;left:0;bottom:0;width:364px;height:184px;pointer-events:none;z-index:0}
  .deco-bl img{width:100%;height:100%;object-fit:fill}

  /* ── Watermark ── */
  .wm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:478px;height:474px;opacity:0.13;z-index:0;pointer-events:none}
  .wm img{width:100%;height:100%;object-fit:contain}

  /* ── Content layer (above decos, fills page via flex:1) ── */
  .content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column}

  /* ── Header ── */
  .hd-title{font-family:'Oswald',sans-serif;font-weight:700;font-size:38px;color:#155689;letter-spacing:0.38px;line-height:1.1}
  .hd-periode{font-family:'Montserrat',sans-serif;font-weight:700;font-size:14px;color:#155689;letter-spacing:0.14px;margin-top:3px}
  .hd-logo{position:absolute;top:0;right:0}
  .hd-logo img{height:68px;width:auto;object-fit:contain}

  /* ── Info block ── */
  .info-wrap{display:flex;align-items:flex-start;margin-top:18px;margin-bottom:18px;gap:24px}
  .avatar-circle{width:128px;height:128px;border-radius:50%;background:#d9d9d9;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:700;color:#155689}
  .avatar-circle img{width:100%;height:100%;object-fit:cover}
  .info-rows{display:flex;flex-direction:column;padding-top:6px}
  .info-row{display:flex;align-items:baseline;font-size:14px;line-height:23px}
  .info-lbl{font-weight:500;color:#000;min-width:160px;flex-shrink:0}
  .info-sep{font-weight:500;color:#000;margin:0 6px}
  .info-val{font-weight:500;color:#000}

  /* ── Tables ── */
  .rp-table{width:100%;border-collapse:collapse;font-size:14px;font-family:'Montserrat',sans-serif}
  .rp-table th{background:#155689;color:#fff;font-weight:700;text-align:center;padding:7px 10px;letter-spacing:0.42px;border:1px solid #155689}
  .rp-table td{font-weight:500;text-align:center;padding:7px 10px;color:#000;border-top:1px solid #155689;border-left:1px solid #155689;letter-spacing:0.42px}
  .rp-table tr td:last-child,.rp-table tr th:last-child{border-right:1px solid #155689}
  .rp-table tbody tr:last-child td{border-bottom:1px solid #155689}

  /* ── PBT heading ── */
  .pbt-heading{font-family:'Oswald',sans-serif;font-weight:700;font-size:19px;color:#155689;letter-spacing:0.19px;margin-top:16px;margin-bottom:6px}

  /* ── Note ── */
  .note-lbl{font-family:'Montserrat',sans-serif;font-style:italic;font-weight:600;font-size:14px;color:#155689;letter-spacing:0.14px;margin-top:14px;margin-bottom:4px}
  .note-box{border:1px solid #155689;border-radius:9px;min-height:54px;width:100%;box-sizing:border-box;padding:8px 14px;font-size:13px;font-weight:400;color:#000;line-height:1.4;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word}

  /* ── Char row ── */
  .char-row{display:grid;grid-template-columns:1fr 1fr;gap:2px 0;margin-top:10px}
  .char-item{display:flex;align-items:center;gap:5px}
  .char-lbl-l{font-size:12px;font-weight:400;color:#000;min-width:107px;flex-shrink:0}
  .char-lbl-r{font-size:12px;font-weight:400;color:#000;min-width:173px;flex-shrink:0}
  .char-val{font-size:12px;font-weight:500;font-style:italic;color:#000;word-wrap:break-word;overflow-wrap:break-word}

  /* ── Signatures — margin-top:auto pushes to bottom of flex container ── */
  .sign-section{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:auto;padding-top:14px;padding-bottom:6px}
  .sign-col{text-align:center}
  .sign-img{height:80px;display:flex;align-items:flex-end;justify-content:center}
  .sign-img img{max-height:76px;max-width:180px;object-fit:contain}
  .sign-line{border-top:1px solid #000;padding-top:3px;width:160px;margin:0 auto}
  .sign-name{font-size:12px;font-style:italic;font-weight:500;color:#000}
  .sign-title{font-size:12px;font-style:italic;font-weight:600;color:#000;text-transform:uppercase;letter-spacing:0.12px;white-space:nowrap}

  /* ── Footer ── */
  .footer{display:flex;align-items:center;gap:16px;margin-top:12px;justify-content:flex-end}
  .footer-item{display:flex;align-items:center;gap:5px;font-size:10px;color:#000}
  .footer-item img{height:13px;width:auto;vertical-align:middle}

  @media print{
    body{background:#fff}
    .page{margin:0;width:100%}
    @page{margin:0;size:A4 portrait}
  }
`;

// ── Core HTML builder (assets-agnostic) ──────────────────────────────────────

function buildRaporHtml(s: PrintStudent, assets: RaporAssets): string {
  const criteriaMap = new Map((s.criteria ?? []).map(c => [c.id, c]));
  const scoreEntries = Object.entries(s.scores);
  const bestTimes = s.best_times ?? [];

  // Avatar HTML
  const avatarHtml = s.avatar_url
    ? `<img src="${s.avatar_url}" alt="${escapeHtml(s.full_name)}" onerror="this.src='${assets.profilePh}'" />`
    : `<img src="${assets.profilePh}" alt="" />`;

  // Age
  const age = s.age != null
    ? `${s.age} tahun`
    : s.birth_date
      ? `${calcAgeFromDate(s.birth_date)} tahun`
      : "—";

  // Info rows
  const infoRows = [
    { label: "ID NUMBER", value: s.member_no ?? "—" },
    { label: "FULL NAME",  value: escapeHtml(s.full_name) },
    { label: "AGE",        value: age },
    { label: "LEVEL",      value: escapeHtml(s.level ?? "—") },
    { label: "CLASS",      value: escapeHtml(s.class_name) },
    { label: "LOCATION",   value: escapeHtml(s.location ?? "—") },
  ];

  // Skill rows — ordered by criteria sort_order when available
  const orderedScoreEntries = (s.criteria ?? []).length > 0
    ? (s.criteria ?? [])
        .filter(c => c.id in s.scores)
        .map(c => [c.id, s.scores[c.id]] as [string, number | string])
    : scoreEntries;

  const skillRows = orderedScoreEntries.length > 0
    ? orderedScoreEntries.map(([key, val]) => {
        const crit    = criteriaMap.get(key);
        const label   = crit?.label ?? key.replace(/_/g, " ");
        const kind    = crit?.kind ?? (typeof val === "number" && val <= 10 ? "score_10" : typeof val === "number" ? "score_100" : "text");
        const display = scoreLabel(val, kind);
        return `<tr><td style="text-align:left;padding-left:16px">${escapeHtml(label.toUpperCase())}</td><td>${escapeHtml(display)}</td></tr>`;
      }).join("")
    : `<tr><td colspan="2" style="text-align:center;color:#888;font-style:italic;padding:12px">Belum ada penilaian</td></tr>`;

  // PBT columns — prefer the member's LEVEL-defined strokes/distances (consistent grid shape
  // across every member on the same level); fall back to dynamic discovery from this member's
  // own recorded times for legacy entries with no level, or a level with an empty template.
  const uniqueStrokesFallback = [...new Set(bestTimes.map(t => t.stroke.toUpperCase()))].sort();
  const uniqueDistsFallback   = [...new Set(bestTimes.map(t => Number(t.distance)))].sort((a, b) => a - b);
  const STROKES = (s.level_strokes && s.level_strokes.length > 0)
    ? s.level_strokes.map(x => x.toUpperCase())
    : (uniqueStrokesFallback.length > 0 ? uniqueStrokesFallback : ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY"]);
  const DISTS = (s.level_distances && s.level_distances.length > 0)
    ? s.level_distances
    : (uniqueDistsFallback.length > 0 ? uniqueDistsFallback : [25, 50, 100]);

  const distHeaders = DISTS.map(d => `<th>${d}M</th>`).join("");
  const pbtRows = STROKES.map(stroke => {
    const cells = DISTS.map(d => {
      const hit = bestTimes.find(t => t.stroke.toUpperCase() === stroke && Number(t.distance) === d);
      return `<td>${hit ? fmtSwimTime(hit.time_seconds) : "NT"}</td>`;
    }).join("");
    return `<tr><td style="text-align:left;padding-left:16px">${stroke}</td>${cells}</tr>`;
  }).join("");

  // Char values
  const attendance = s.attendance_rate != null ? `${Math.round(s.attendance_rate)}%` : "—";
  const personality = escapeHtml(s.personality || "—");
  const motivation  = escapeHtml(s.motivation  || "—");
  const learningAch = escapeHtml(s.learning_achievements || "—");

  // Signature: coach (left) — uploaded or placeholder
  const coachSigSrc = s.coach_signature_url
    ? escapeHtml(s.coach_signature_url)
    : assets.coachSigPh;

  return `
  <div class="page">
    <!-- Decorative assets (absolute to .page) -->
    <div class="deco-tr"><img src="${assets.assetTR}" alt="" /></div>
    <div class="deco-bl"><img src="${assets.assetBL}" alt="" /></div>

    <!-- Watermark -->
    <div class="wm"><img src="${assets.watermark}" alt="" /></div>

    <div class="content">

      <!-- HEADER -->
      <div style="position:relative;min-height:62px">
        <div>
          <div class="hd-title">REPORT CARD</div>
          <div class="hd-periode">PERIODE : ${escapeHtml(s.period_label.toUpperCase())}</div>
        </div>
        <div class="hd-logo">
          <img src="${assets.logoHeader}" alt="NEXT Swimming School"
               onerror="this.style.display='none'" />
        </div>
      </div>

      <!-- INFO MEMBER -->
      <div class="info-wrap">
        <div class="avatar-circle">${avatarHtml}</div>
        <div class="info-rows">
          ${infoRows.map(r => `
          <div class="info-row">
            <span class="info-lbl">${r.label}</span>
            <span class="info-sep">:</span>
            <span class="info-val">${r.value}</span>
          </div>`).join("")}
        </div>
      </div>

      <!-- SKILLS TABLE -->
      <table class="rp-table">
        <thead>
          <tr>
            <th style="width:70%;text-align:left;padding-left:16px">SKILL / ASPEK</th>
            <th style="width:30%">CRITERIA</th>
          </tr>
        </thead>
        <tbody>${skillRows}</tbody>
      </table>

      <!-- PERSONAL BEST TIME -->
      <div class="pbt-heading">PERSONAL BEST TIME</div>
      <table class="rp-table">
        <thead>
          <tr>
            <th style="text-align:left;padding-left:16px">STYLE</th>
            ${distHeaders}
          </tr>
        </thead>
        <tbody>${pbtRows}</tbody>
      </table>

      <!-- NOTE -->
      <div class="note-lbl">NOTE:</div>
      <div class="note-box">${s.notes ? escapeHtml(s.notes) : ""}</div>

      <!-- CHAR ROW -->
      <div class="char-row">
        <div class="char-item">
          <span class="char-lbl-l">Attendance</span>
          <span class="char-val">${attendance}</span>
        </div>
        <div class="char-item">
          <span class="char-lbl-r">Motivation to learn</span>
          <span class="char-val">${motivation}</span>
        </div>
        <div class="char-item">
          <span class="char-lbl-l">Personality</span>
          <span class="char-val">${personality}</span>
        </div>
        <div class="char-item">
          <span class="char-lbl-r">Learning Achievements</span>
          <span class="char-val">${learningAch}</span>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="sign-section">
        <div class="sign-col">
          <div class="sign-img">
            <img src="${coachSigSrc}" alt="Coach signature" />
          </div>
          <div class="sign-line">
            <div class="sign-name">${escapeHtml(s.coach_name)}</div>
            <div class="sign-title">HEAD COACH</div>
          </div>
        </div>
        <div class="sign-col">
          <div class="sign-img">
            <img src="${assets.syahrilSig}" alt="Syahril Sidik" />
          </div>
          <div class="sign-line">
            <div class="sign-name">Syahril Sidik</div>
            <div class="sign-title">HEAD OF NEXT SWIMMING</div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-item">
          <img src="${assets.igIcon}" alt="" />
          @nextswim
        </div>
        <div class="footer-item">
          <img src="${assets.emailIcon}" alt="" />
          nextcanswim@gmail.com
        </div>
      </div>

    </div>
  </div>`;
}

// ── Public server-side export ─────────────────────────────────────────────────

/**
 * Build a full standalone HTML document for a rapor.
 * Designed for use in the API route with pre-resolved data URIs for all assets.
 * Assets can also be URLs if the rendering environment has network access.
 */
export function buildRaporHtmlStandalone(s: PrintStudent, assets: RaporAssets): string {
  return `<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8">
    <title>Rapor — ${escapeHtml(s.full_name)}</title>
    <style>${STYLES}</style>
  </head><body style="margin:0;padding:0">
    ${buildRaporHtml(s, assets)}
  </body></html>`;
}

// ── Client-side public API ────────────────────────────────────────────────────

/**
 * Download rapor as a real PDF via the /api/rapor/pdf server route.
 * Falls back to a print popup if the API call fails (e.g. local dev without Chromium).
 */
export async function downloadRaporPdf(student: PrintStudent): Promise<void> {
  try {
    const res = await fetch("/api/rapor/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    });

    if (!res.ok) throw new Error(`PDF API error: ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapor-${sanitizeFilename(student.full_name)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: open popup with print dialog
    const origin = window.location.origin;
    const assets = assetsFromOrigin(origin);
    const w = window.open("", "_blank", "width=860,height=1200");
    if (!w) throw new Error("Popup diblokir browser — izinkan pop-up untuk situs ini lalu coba lagi.");
    w.document.write(buildRaporHtmlStandalone(student, assets));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 800);
  }
}

/** Buka popup print dialog (tidak download PDF — untuk tombol "Print"). */
export function printSingleRaporPopup(student: PrintStudent): void {
  const origin = window.location.origin;
  const assets = assetsFromOrigin(origin);
  const w = window.open("", "_blank", "width=860,height=1200");
  if (!w) return;
  w.document.write(buildRaporHtmlStandalone(student, assets));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 800);
}

