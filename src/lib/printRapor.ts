/**
 * Shared rapor print/PDF utility.
 * Reproduces the NEXT Swimming School Report Card design exactly.
 * Used by: school/page.tsx, member/page.tsx, coach/page.tsx
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
  attendance_rate?: number | null; // 0–100 percentage
  best_times?: PrintBestTime[];
  criteria?: PrintCriterion[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format seconds (e.g. 75.34) as "1:15.34" */
function fmtSwimTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const sPad = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
  return m > 0 ? `${m}:${sPad}` : `${sPad}`;
}

/** Get the best time for a specific stroke+distance combo */
function getBest(times: PrintBestTime[], stroke: string, distance: number): string {
  const hit = times.filter(t => t.stroke === stroke && t.distance === distance)
    .sort((a, b) => a.time_seconds - b.time_seconds)[0];
  return hit ? fmtSwimTime(hit.time_seconds) : "NT";
}

/** Render a score value as criteria string (for choice/text kinds or numeric) */
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

// ── CSS ───────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',Arial,sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Page ── */
  .page{
    width:595px;
    min-height:842px;
    background:#fff;
    position:relative;
    overflow:hidden;
    margin:0 auto;
  }

  /* ── Large diagonal watermark logo (bottom-left) ── */
  .watermark{
    position:absolute;
    left:-30px;
    top:60px;
    width:320px;
    height:320px;
    opacity:0.06;
    z-index:0;
    pointer-events:none;
  }
  .watermark img{width:100%;height:100%;object-fit:contain}

  /* ── Content above watermark ── */
  .content{position:relative;z-index:1}

  /* ── Header ── */
  .header{
    background:#155689;
    padding:0;
    display:flex;
    align-items:stretch;
    min-height:54px;
  }
  .header-left{
    background:#fff;
    width:14px;
    flex-shrink:0;
  }
  .header-title-block{
    flex:1;
    padding:10px 14px 10px 18px;
    display:flex;
    flex-direction:column;
    justify-content:center;
  }
  .header-report{
    font-size:22px;
    font-weight:900;
    color:#fff;
    letter-spacing:.04em;
    line-height:1;
    text-transform:uppercase;
  }
  .header-periode{
    font-size:8px;
    font-weight:600;
    color:rgba(255,255,255,.75);
    letter-spacing:.12em;
    text-transform:uppercase;
    margin-top:3px;
  }
  .header-logo{
    padding:6px 14px;
    display:flex;
    align-items:center;
    justify-content:flex-end;
    flex-shrink:0;
  }
  .header-logo img{
    height:40px;
    width:auto;
    object-fit:contain;
    filter:brightness(0) invert(1);
  }
  .header-logo .logo-text{
    font-size:20px;
    font-weight:900;
    color:#fff;
    letter-spacing:.06em;
  }

  /* ── Info section ── */
  .info-section{
    display:flex;
    gap:0;
    padding:14px 20px 10px 20px;
    border-bottom:2px solid #155689;
  }
  .avatar-col{
    width:72px;
    flex-shrink:0;
    margin-right:16px;
  }
  .avatar-circle{
    width:68px;
    height:68px;
    border-radius:50%;
    background:#e0e9f0;
    border:2px solid #155689;
    overflow:hidden;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#155689;
    font-size:24px;
    font-weight:700;
  }
  .avatar-circle img{width:100%;height:100%;object-fit:cover}

  .info-grid{
    flex:1;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:2px 24px;
  }
  .info-row{
    display:flex;
    align-items:baseline;
    gap:0;
    font-size:8.5px;
    line-height:1.7;
  }
  .info-label{
    font-weight:700;
    color:#000;
    text-transform:uppercase;
    letter-spacing:.04em;
    min-width:60px;
    flex-shrink:0;
  }
  .info-colon{
    margin:0 6px;
    color:#000;
    font-weight:700;
  }
  .info-value{
    color:#000;
    font-weight:500;
  }

  /* ── Section heading ── */
  .section-heading{
    background:#155689;
    color:#fff;
    font-size:9px;
    font-weight:800;
    letter-spacing:.12em;
    text-transform:uppercase;
    padding:5px 20px;
    margin-top:0;
  }

  /* ── Skill table ── */
  .skill-table{
    width:100%;
    border-collapse:collapse;
    font-size:8.5px;
  }
  .skill-table th{
    background:#155689;
    color:#fff;
    font-weight:700;
    letter-spacing:.08em;
    text-transform:uppercase;
    padding:5px 20px;
    text-align:left;
  }
  .skill-table th:last-child{text-align:center;width:140px}
  .skill-table td{
    padding:5px 20px;
    border-bottom:1px solid #e8ecef;
    color:#000;
    font-weight:500;
    text-transform:uppercase;
    letter-spacing:.04em;
  }
  .skill-table td:last-child{text-align:center;font-weight:700}
  .skill-table tr:nth-child(even) td{background:#f5f8fb}

  /* ── Personal best time table ── */
  .pbt-table{
    width:100%;
    border-collapse:collapse;
    font-size:8.5px;
    margin-top:0;
  }
  .pbt-table th{
    background:#155689;
    color:#fff;
    font-weight:700;
    letter-spacing:.08em;
    text-transform:uppercase;
    padding:5px 0;
    text-align:center;
  }
  .pbt-table th:first-child{text-align:left;padding-left:20px;width:30%}
  .pbt-table td{
    padding:5px 0;
    text-align:center;
    border-bottom:1px solid #e8ecef;
    color:#000;
    font-weight:500;
    font-family:monospace;
    text-transform:uppercase;
  }
  .pbt-table td:first-child{text-align:left;padding-left:20px;font-family:inherit;font-weight:600}
  .pbt-table tr:nth-child(even) td{background:#f5f8fb}

  /* ── Note box ── */
  .note-section{
    padding:6px 20px 0;
  }
  .note-label{
    font-size:8px;
    font-weight:800;
    color:#000;
    text-transform:uppercase;
    letter-spacing:.08em;
    margin-bottom:2px;
  }
  .note-box{
    border:1px solid #c5cdd4;
    border-radius:2px;
    min-height:38px;
    padding:6px 8px;
    font-size:8.5px;
    color:#222;
    line-height:1.5;
  }

  /* ── Bottom character row ── */
  .char-row{
    display:grid;
    grid-template-columns:1fr 1fr 1fr 1fr;
    gap:0;
    padding:8px 20px 0;
    border-top:1px solid #dde2e7;
    margin-top:8px;
  }
  .char-item{}
  .char-item .clbl{
    font-size:7.5px;
    font-weight:700;
    color:#000;
    text-transform:uppercase;
    letter-spacing:.06em;
  }
  .char-item .cval{
    font-size:8.5px;
    color:#222;
    margin-top:1px;
    font-weight:500;
  }

  /* ── Signature section ── */
  .sign-section{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:0;
    padding:10px 20px 8px;
    margin-top:6px;
  }
  .sign-col{
    text-align:center;
    position:relative;
  }
  .sign-col .sign-role{
    font-size:7.5px;
    font-weight:700;
    color:#000;
    text-transform:uppercase;
    letter-spacing:.08em;
    margin-bottom:28px;
  }
  .sign-col .sign-line{
    border-top:1.5px solid #000;
    padding-top:3px;
  }
  .sign-col .sign-name{
    font-size:8px;
    font-weight:700;
    color:#000;
    text-transform:uppercase;
    letter-spacing:.04em;
  }
  .sign-col .sign-title{
    font-size:7.5px;
    color:#555;
    text-transform:uppercase;
    letter-spacing:.04em;
  }
  .sign-col .sign-stamp{
    position:absolute;
    right:10px;
    bottom:0;
    width:52px;
    height:52px;
    opacity:.35;
  }
  .sign-col .sign-stamp img{width:100%;height:100%;object-fit:contain}

  /* ── Footer ── */
  .footer{
    border-top:2px solid #155689;
    padding:5px 20px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-top:4px;
  }
  .footer-social{
    display:flex;
    align-items:center;
    gap:10px;
    font-size:7px;
    color:#155689;
    font-weight:600;
  }
  .footer-social span{display:flex;align-items:center;gap:3px}
  .footer-social svg{flex-shrink:0}
  .footer-right{
    font-size:7px;
    color:#888;
    text-align:right;
  }

  @media print{
    body{background:#fff}
    .page{margin:0;width:100%}
    @page{margin:0;size:A4 portrait}
  }
`;

// ── SVG icons for footer ──────────────────────────────────────────────────────

const ICON_IG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#155689" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="#155689" stroke="none"/></svg>`;
const ICON_FB = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#155689" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`;
const ICON_EMAIL = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#155689" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;

// ── Main HTML builder ─────────────────────────────────────────────────────────

function buildRaporHtml(s: PrintStudent, logoSrc: string, schoolBrandName = "NEXT"): string {
  const criteriaMap = new Map((s.criteria ?? []).map(c => [c.id, c]));
  const scoreEntries = Object.entries(s.scores);
  const bestTimes = s.best_times ?? [];

  // Info rows
  const infoLeft = [
    { label: "ID NUMBER", value: s.member_no ?? "—" },
    { label: "FULL NAME",  value: s.full_name },
    { label: "AGE",        value: s.age != null ? `${s.age}` : (s.birth_date ? calcAgeFromDate(s.birth_date).toString() : "—") },
  ];
  const infoRight = [
    { label: "LEVEL",    value: s.level ?? s.class_name ?? "—" },
    { label: "CLASS",    value: s.class_name },
    { label: "LOCATION", value: s.location ?? "—" },
  ];

  // Avatar
  const avatarInitial = s.full_name.charAt(0).toUpperCase();
  const avatarHtml = s.avatar_url
    ? `<img src="${s.avatar_url}" alt="${s.full_name}" />`
    : `<span>${avatarInitial}</span>`;

  // Skill rows
  const skillRows = scoreEntries.length > 0
    ? scoreEntries.map(([key, val]) => {
        const crit  = criteriaMap.get(key);
        const label = crit?.label ?? key.replace(/_/g, " ");
        const kind  = crit?.kind ?? (typeof val === "number" && val <= 10 ? "score_10" : typeof val === "number" ? "score_100" : "text");
        const display = scoreLabel(val, kind);
        return `<tr><td>${label.toUpperCase()}</td><td>${display}</td></tr>`;
      }).join("")
    : `<tr><td colspan="2" style="text-align:center;color:#888;font-style:italic;padding:12px">Belum ada penilaian</td></tr>`;

  // PBT rows — derive strokes and distances from actual data
  const uniqueStrokes = [...new Set(bestTimes.map(t => t.stroke.toUpperCase()))].sort();
  const uniqueDists   = [...new Set(bestTimes.map(t => Number(t.distance)))].sort((a, b) => a - b);
  const STROKES_DISPLAY = uniqueStrokes.length > 0 ? uniqueStrokes : ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY"];
  const DISTS_DISPLAY   = uniqueDists.length   > 0 ? uniqueDists   : [25, 50, 100];

  const pbtRows = STROKES_DISPLAY.map(stroke => {
    const cells = DISTS_DISPLAY.map(d => {
      const hit = bestTimes.find(t =>
        t.stroke.toUpperCase() === stroke && Number(t.distance) === d
      );
      return `<td>${hit ? fmtSwimTime(hit.time_seconds) : "NT"}</td>`;
    }).join("");
    return `<tr><td>${stroke}</td>${cells}</tr>`;
  }).join("");

  // Character bottom row
  const attendance = s.attendance_rate != null ? `${Math.round(s.attendance_rate)}%` : "—";
  const personality = s.personality || "—";
  const motivation  = s.motivation  || "—";
  const learningAch = s.learning_achievements || "—";

  return `
  <div class="page">
    <!-- Watermark -->
    <div class="watermark">
      <img src="${logoSrc}" alt="" />
    </div>

    <div class="content">
      <!-- Header -->
      <div class="header">
        <div class="header-left"></div>
        <div class="header-title-block">
          <div class="header-report">REPORT CARD</div>
          <div class="header-periode">PERIODE : ${s.period_label.toUpperCase()}</div>
        </div>
        <div class="header-logo">
          <img src="${logoSrc}" alt="${schoolBrandName}" onerror="this.style.display='none';this.parentNode.innerHTML='<span class=\\'logo-text\\'>${schoolBrandName}</span>'" />
        </div>
      </div>

      <!-- Info section -->
      <div class="info-section">
        <div class="avatar-col">
          <div class="avatar-circle">${avatarHtml}</div>
        </div>
        <div class="info-grid">
          ${infoLeft.map((r, i) => `
            <div class="info-row">
              <span class="info-label">${r.label}</span>
              <span class="info-colon">:</span>
              <span class="info-value">${r.value}</span>
            </div>
          `).join("")}
          ${infoRight.map(r => `
            <div class="info-row">
              <span class="info-label">${r.label}</span>
              <span class="info-colon">:</span>
              <span class="info-value">${r.value}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Skill & Criteria -->
      <table class="skill-table">
        <thead>
          <tr>
            <th>SKILL</th>
            <th>CRITERIA</th>
          </tr>
        </thead>
        <tbody>
          ${skillRows}
        </tbody>
      </table>

      <!-- Personal Best Time -->
      <div class="section-heading">PERSONAL BEST TIME</div>
      <table class="pbt-table">
        <thead>
          <tr>
            <th>STYLE</th>
            ${DISTS_DISPLAY.map(d => `<th>${d}M</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${pbtRows}
        </tbody>
      </table>

      <!-- Note -->
      <div class="note-section">
        <div class="note-label">NOTE:</div>
        <div class="note-box">${s.notes ? escapeHtml(s.notes) : ""}</div>
      </div>

      <!-- Character row -->
      <div class="char-row">
        <div class="char-item">
          <div class="clbl">Attendance</div>
          <div class="cval">${attendance}</div>
        </div>
        <div class="char-item">
          <div class="clbl">Personality</div>
          <div class="cval">${escapeHtml(personality)}</div>
        </div>
        <div class="char-item">
          <div class="clbl">Motivation to learn</div>
          <div class="cval">${escapeHtml(motivation)}</div>
        </div>
        <div class="char-item">
          <div class="clbl">Learning Achievements</div>
          <div class="cval">${escapeHtml(learningAch)}</div>
        </div>
      </div>

      <!-- Signatures -->
      <div class="sign-section">
        <div class="sign-col">
          <div class="sign-role">Head Coach</div>
          <div class="sign-line">
            <div class="sign-name">${escapeHtml(s.coach_name)}</div>
            <div class="sign-title">Head Coach</div>
          </div>
        </div>
        <div class="sign-col">
          <div class="sign-role">Head Dept / Headmaster</div>
          <div class="sign-stamp">
            <img src="${logoSrc}" alt="" />
          </div>
          <div class="sign-line">
            <div class="sign-name">Syahril Sidik</div>
            <div class="sign-title">Head Dept / Headmaster</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-social">
          <span>${ICON_IG} @nextswim</span>
          <span>${ICON_FB} @nextswimmingschool</span>
          <span>${ICON_EMAIL} nextswimschool@gmail.com</span>
        </div>
        <div class="footer-right">Dicetak ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</div>
      </div>
    </div>
  </div>`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function calcAgeFromDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Print a single student's rapor */
export function printSingleRapor(student: PrintStudent): void {
  const w = window.open("", "_blank", "width=680,height=960");
  if (!w) return;
  const logoSrc = `${window.location.origin}/logo.png`;

  w.document.write(`<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8">
    <title>Rapor — ${escapeHtml(student.full_name)}</title>
    <style>${STYLES}</style>
  </head><body>
    ${buildRaporHtml(student, logoSrc)}
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

/** Print rekap rapor semua siswa sekolah afiliasi */
export function printSchoolRekap(schoolName: string, periodLabel: string, students: PrintStudent[]): void {
  const w = window.open("", "_blank", "width=680,height=960");
  if (!w) return;
  const logoSrc = `${window.location.origin}/logo.png`;
  const date = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });

  const coverHtml = `
  <div style="min-height:100vh;background:#155689;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;page-break-after:always">
    <img src="${logoSrc}" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;filter:brightness(0) invert(1)" alt="" />
    <div style="font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.6;margin-bottom:8px">REKAP RAPOR PERKEMBANGAN SISWA</div>
    <div style="font-size:28px;font-weight:900;letter-spacing:.02em;margin-bottom:6px">${escapeHtml(schoolName)}</div>
    <div style="font-size:14px;opacity:.75;margin-bottom:32px">${escapeHtml(periodLabel)}</div>
    <div style="display:flex;gap:20px">
      ${[["Total Siswa", students.length], ["Rapor Tersedia", students.filter(s => Object.keys(s.scores).length > 0 || s.notes).length], ["Belum Diisi", students.filter(s => Object.keys(s.scores).length === 0 && !s.notes).length]].map(([lbl, num]) => `
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
      ${buildRaporHtml(s, logoSrc)}
    </div>`).join("");

  w.document.write(`<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8">
    <title>Rekap Rapor — ${escapeHtml(schoolName)}</title>
    <style>${STYLES}
      body{position:relative}
    </style>
  </head><body>
    ${coverHtml}
    ${studentPages}
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}
