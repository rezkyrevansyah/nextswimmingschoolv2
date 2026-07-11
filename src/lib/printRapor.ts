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
  criteria?: PrintCriterion[];
  coach_signature_url?: string | null; // uploaded coach signature from R2
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

  /* ── Page: fixed A4 — flexbox fills the full height ── */
  .page{width:595px;height:842px;background:#fff;position:relative;margin:0 auto;padding:20px 57px 16px 57px;display:flex;flex-direction:column;overflow:hidden}

  /* ── Decorative assets (absolute to .page) ── */
  .deco-tr{position:absolute;top:0;right:0;width:200px;height:200px;pointer-events:none;z-index:0}
  .deco-tr img{width:100%;height:100%;object-fit:fill}
  .deco-bl{position:absolute;left:0;bottom:0;width:273px;height:138px;pointer-events:none;z-index:0}
  .deco-bl img{width:100%;height:100%;object-fit:fill}

  /* ── Watermark ── */
  .wm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:358px;height:355px;opacity:0.13;z-index:0;pointer-events:none}
  .wm img{width:100%;height:100%;object-fit:contain}

  /* ── Content layer (above decos, fills page via flex:1) ── */
  .content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column}

  /* ── Header ── */
  .hd-title{font-family:'Oswald',sans-serif;font-weight:700;font-size:28px;color:#155689;letter-spacing:0.28px;line-height:1.1}
  .hd-periode{font-family:'Montserrat',sans-serif;font-weight:700;font-size:11px;color:#155689;letter-spacing:0.11px;margin-top:2px}
  .hd-logo{position:absolute;top:0;right:0}
  .hd-logo img{height:50px;width:auto;object-fit:contain}

  /* ── Info block ── */
  .info-wrap{display:flex;align-items:flex-start;margin-top:12px;margin-bottom:12px;gap:18px}
  .avatar-circle{width:96px;height:96px;border-radius:50%;background:#d9d9d9;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#155689}
  .avatar-circle img{width:100%;height:100%;object-fit:cover}
  .info-rows{display:flex;flex-direction:column;padding-top:4px}
  .info-row{display:flex;align-items:baseline;font-size:11px;line-height:17px}
  .info-lbl{font-weight:500;color:#000;min-width:120px;flex-shrink:0}
  .info-sep{font-weight:500;color:#000;margin:0 4px}
  .info-val{font-weight:500;color:#000}

  /* ── Tables ── */
  .rp-table{width:100%;border-collapse:collapse;font-size:11px;font-family:'Montserrat',sans-serif}
  .rp-table th{background:#155689;color:#fff;font-weight:700;text-align:center;padding:5px 8px;letter-spacing:0.33px;border:1px solid #155689}
  .rp-table td{font-weight:500;text-align:center;padding:5px 8px;color:#000;border-top:1px solid #155689;border-left:1px solid #155689;letter-spacing:0.33px}
  .rp-table tr td:last-child,.rp-table tr th:last-child{border-right:1px solid #155689}
  .rp-table tbody tr:last-child td{border-bottom:1px solid #155689}

  /* ── PBT heading ── */
  .pbt-heading{font-family:'Oswald',sans-serif;font-weight:700;font-size:14px;color:#155689;letter-spacing:0.14px;margin-top:12px;margin-bottom:4px}

  /* ── Note ── */
  .note-lbl{font-family:'Montserrat',sans-serif;font-style:italic;font-weight:600;font-size:11px;color:#155689;letter-spacing:0.11px;margin-top:10px;margin-bottom:3px}
  .note-box{border:1px solid #155689;border-radius:7px;min-height:40px;width:100%;padding:6px 10px;font-size:10px;font-weight:400;color:#000;line-height:1.4}

  /* ── Char row ── */
  .char-row{display:grid;grid-template-columns:1fr 1fr;gap:1px 0;margin-top:8px}
  .char-item{display:flex;align-items:center;gap:4px}
  .char-lbl-l{font-size:9px;font-weight:400;color:#000;min-width:80px;flex-shrink:0}
  .char-lbl-r{font-size:9px;font-weight:400;color:#000;min-width:130px;flex-shrink:0}
  .char-val{font-size:9px;font-weight:500;font-style:italic;color:#000}

  /* ── Signatures — margin-top:auto pushes to bottom of flex container ── */
  .sign-section{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:auto;padding-top:10px}
  .sign-col{text-align:center}
  .sign-img{height:50px;display:flex;align-items:flex-end;justify-content:center}
  .sign-img img{max-height:48px;max-width:120px;object-fit:contain}
  .sign-line{border-top:1px solid #000;padding-top:2px;width:120px;margin:0 auto}
  .sign-name{font-size:9px;font-style:italic;font-weight:500;color:#000}
  .sign-title{font-size:9px;font-style:italic;font-weight:600;color:#000;text-transform:uppercase;letter-spacing:0.1px;white-space:nowrap}

  /* ── Footer ── */
  .footer{display:flex;align-items:center;gap:12px;margin-top:6px;justify-content:flex-end}
  .footer-item{display:flex;align-items:center;gap:4px;font-size:8px;color:#000}
  .footer-item img{height:10px;width:auto;vertical-align:middle}

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

  // Skill rows
  const skillRows = scoreEntries.length > 0
    ? scoreEntries.map(([key, val]) => {
        const crit    = criteriaMap.get(key);
        const label   = crit?.label ?? key.replace(/_/g, " ");
        const kind    = crit?.kind ?? (typeof val === "number" && val <= 10 ? "score_10" : typeof val === "number" ? "score_100" : "text");
        const display = scoreLabel(val, kind);
        return `<tr><td style="text-align:left;padding-left:16px">${escapeHtml(label.toUpperCase())}</td><td>${escapeHtml(display)}</td></tr>`;
      }).join("")
    : `<tr><td colspan="2" style="text-align:center;color:#888;font-style:italic;padding:12px">Belum ada penilaian</td></tr>`;

  // PBT columns
  const uniqueStrokes = [...new Set(bestTimes.map(t => t.stroke.toUpperCase()))].sort();
  const uniqueDists   = [...new Set(bestTimes.map(t => Number(t.distance)))].sort((a, b) => a - b);
  const STROKES = uniqueStrokes.length > 0 ? uniqueStrokes : ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY"];
  const DISTS   = uniqueDists.length   > 0 ? uniqueDists   : [25, 50, 100];

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
            <th style="width:356px;text-align:left;padding-left:16px">SKILL / ASPEK</th>
            <th style="width:125px">CRITERIA</th>
          </tr>
        </thead>
        <tbody>${skillRows}</tbody>
      </table>

      <!-- PERSONAL BEST TIME -->
      <div class="pbt-heading">PERSONAL BEST TIME</div>
      <table class="rp-table">
        <thead>
          <tr>
            <th style="text-align:left;padding-left:16px">STROKE</th>
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
    link.download = `rapor-${student.full_name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    // Fallback: open popup with print dialog
    const origin = window.location.origin;
    const assets = assetsFromOrigin(origin);
    const w = window.open("", "_blank", "width=680,height=960");
    if (!w) return;
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
  const w = window.open("", "_blank", "width=680,height=960");
  if (!w) return;
  w.document.write(buildRaporHtmlStandalone(student, assets));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 800);
}

/** @deprecated Use downloadRaporPdf() instead. */
export function printSingleRapor(student: PrintStudent): void {
  void downloadRaporPdf(student);
}

/** Print rekap rapor semua siswa sekolah afiliasi (school panel) */
export function printSchoolRekap(
  schoolName: string,
  periodLabel: string,
  students: PrintStudent[]
): void {
  const w = window.open("", "_blank", "width=680,height=960");
  if (!w) return;
  const origin = window.location.origin;
  const assets = assetsFromOrigin(origin);
  const logoUrl = assets.watermark;
  const date = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });

  const coverHtml = `
  <div style="min-height:100vh;background:#155689;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;page-break-after:always;position:relative">
    <img src="${logoUrl}" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;filter:brightness(0) invert(1)" alt="" />
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.6;margin-bottom:8px">REKAP RAPOR PERKEMBANGAN SISWA</div>
    <div style="font-size:28px;font-weight:900;letter-spacing:.02em;margin-bottom:6px">${escapeHtml(schoolName)}</div>
    <div style="font-size:14px;opacity:.75;margin-bottom:32px">${escapeHtml(periodLabel)}</div>
    <div style="display:flex;gap:20px">
      ${[
        ["Total Siswa", students.length],
        ["Rapor Tersedia", students.filter(s => Object.keys(s.scores).length > 0 || s.notes).length],
        ["Belum Diisi",  students.filter(s => Object.keys(s.scores).length === 0 && !s.notes).length],
      ].map(([lbl, num]) => `
        <div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:16px 28px">
          <div style="font-size:32px;font-weight:900">${num}</div>
          <div style="font-size:10px;font-weight:600;opacity:.6;text-transform:uppercase;letter-spacing:.06em;margin-top:4px">${lbl}</div>
        </div>
      `).join("")}
    </div>
    <div style="position:absolute;bottom:20px;font-size:10px;opacity:.4">Dicetak pada ${date}</div>
  </div>`;

  const studentPages = students.map(s => `
    <div style="page-break-after:always">
      ${buildRaporHtml(s, assets)}
    </div>`).join("");

  w.document.write(`<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8">
    <title>Rekap Rapor — ${escapeHtml(schoolName)}</title>
    <style>${STYLES}</style>
  </head><body style="margin:0;padding:0">
    ${coverHtml}
    ${studentPages}
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 800);
}
