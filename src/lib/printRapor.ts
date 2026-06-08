/**
 * Shared rapor print/PDF utility.
 * Opens a styled print window with logo, scores, and coach notes.
 * Used by: school/page.tsx, member/page.tsx, admin rapor.
 */

export interface PrintCriterion {
  id: string;
  label: string;
  kind: "score_10" | "score_100" | "choice" | "text";
}

export interface PrintStudent {
  full_name: string;
  class_name: string;
  coach_name: string;
  period_label: string;
  scores: Record<string, number | string>;
  notes: string | null;
  criteria?: PrintCriterion[];
}

/** Compute a letter grade + color from a numeric percentage */
function gradeInfo(pct: number): { grade: string; color: string; bg: string } {
  if (pct >= 90) return { grade: "A+", color: "#15803d", bg: "#f0fdf4" };
  if (pct >= 80) return { grade: "A",  color: "#16a34a", bg: "#f0fdf4" };
  if (pct >= 70) return { grade: "B+", color: "#0369a1", bg: "#f0f9ff" };
  if (pct >= 60) return { grade: "B",  color: "#0284c7", bg: "#f0f9ff" };
  if (pct >= 50) return { grade: "C+", color: "#b45309", bg: "#fffbeb" };
  if (pct >= 40) return { grade: "C",  color: "#d97706", bg: "#fffbeb" };
  return           { grade: "D",  color: "#b91c1c", bg: "#fef2f2" };
}

/** Render one score criterion row */
function scoreRowHtml(label: string, val: number | string, kind: string): string {
  if (typeof val === "number") {
    const max  = kind === "score_10" ? 10 : 100;
    const pct  = Math.round((val / max) * 100);
    const bar  = pct >= 70 ? "#22c55e" : pct >= 40 ? "#0ea5e9" : "#f59e0b";
    const { grade, color, bg } = gradeInfo(pct);
    return `
      <div class="criterion">
        <div class="crit-header">
          <span class="crit-label">${label}</span>
          <div class="crit-right">
            <span class="crit-score">${val}<span class="crit-max">/${max}</span></span>
            <span class="grade-badge" style="color:${color};background:${bg};border-color:${color}30">${grade}</span>
          </div>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${bar}"></div>
        </div>
        <div class="bar-pct">${pct}%</div>
      </div>`;
  }
  return `
    <div class="criterion">
      <div class="crit-header"><span class="crit-label">${label}</span></div>
      <div class="text-val">${val}</div>
    </div>`;
}

/** Compute overall average pct across all numeric scores */
function overallPct(scores: Record<string, number | string>, criteria: PrintCriterion[]): number | null {
  const criteriaMap = new Map(criteria.map(c => [c.id, c]));
  const nums: number[] = [];
  for (const [key, val] of Object.entries(scores)) {
    if (typeof val !== "number") continue;
    const crit = criteriaMap.get(key);
    const max  = crit?.kind === "score_10" ? 10 : crit?.kind === "score_100" ? 100 : (val <= 10 ? 10 : 100);
    nums.push(Math.round((val / max) * 100));
  }
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,Arial,sans-serif;color:#0f172a;background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{background:#fff;max-width:720px;margin:0 auto;min-height:100vh}

  /* ── Header ── */
  .rp-header{background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%);padding:28px 36px 24px;position:relative;overflow:hidden}
  .rp-header::before{content:'';position:absolute;right:-60px;top:-60px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.07)}
  .rp-header::after{content:'';position:absolute;right:60px;bottom:-80px;width:180px;height:180px;border-radius:50%;background:rgba(14,165,233,.25)}
  .header-top{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
  .logo-row{display:flex;align-items:center;gap:10px}
  .logo-circle{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);backdrop-filter:blur(4px);border:2px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px;letter-spacing:-1px}
  .brand{font-size:14px;font-weight:700;color:rgba(255,255,255,.95);letter-spacing:.02em}
  .brand-sub{font-size:10px;color:rgba(255,255,255,.6);margin-top:1px}
  .doc-type{font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.1em;background:rgba(255,255,255,.12);padding:4px 10px;border-radius:20px;border:1px solid rgba(255,255,255,.2)}
  .header-title{margin-top:20px;position:relative;z-index:1}
  .header-title h1{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1}
  .header-title p{font-size:13px;color:rgba(255,255,255,.75);margin-top:4px}

  /* ── Info grid ── */
  .info-section{padding:20px 36px 0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:0}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px}
  .info-box .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:3px}
  .info-box .val{font-size:13px;font-weight:600;color:#0f172a}

  /* ── Overall score ── */
  .overall-section{padding:16px 36px}
  .overall-card{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:16px}
  .overall-circle{width:56px;height:56px;border-radius:50%;border:3px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
  .overall-grade{font-size:18px;font-weight:800;line-height:1}
  .overall-pct{font-size:10px;font-weight:600;margin-top:2px;opacity:.8}
  .overall-text .title{font-size:13px;font-weight:700;color:#0c4a6e}
  .overall-text .sub{font-size:11px;color:#64748b;margin-top:2px}

  /* ── Score section ── */
  .scores-section{padding:0 36px}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:18px 0 12px;display:flex;align-items:center;gap:8px}
  .section-title::after{content:'';flex:1;height:1px;background:#e2e8f0}
  .criterion{margin-bottom:14px}
  .crit-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .crit-label{font-size:13px;font-weight:600;color:#1e293b}
  .crit-right{display:flex;align-items:center;gap:8px}
  .crit-score{font-family:monospace;font-size:14px;font-weight:700;color:#0369a1}
  .crit-max{font-size:11px;font-weight:500;color:#94a3b8}
  .grade-badge{font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;border:1px solid}
  .bar-track{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px}
  .bar-pct{font-size:10px;color:#94a3b8;margin-top:3px;text-align:right}
  .text-val{font-size:13px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin-top:4px;line-height:1.5}

  /* ── Notes ── */
  .notes-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 16px;margin-top:4px}
  .notes-box .lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0369a1;margin-bottom:6px}
  .notes-box p{font-size:13px;color:#334155;line-height:1.7}
  .no-scores{text-align:center;padding:32px;color:#94a3b8;font-size:13px;font-style:italic;background:#f8fafc;border-radius:10px;border:1px dashed #e2e8f0}

  /* ── Sign ── */
  .sign-section{padding:20px 36px 0;display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .sign-box{text-align:center}
  .sign-label{font-size:10px;color:#64748b;margin-bottom:40px}
  .sign-line{border-top:1.5px solid #cbd5e1;padding-top:6px}
  .sign-name{font-size:12px;font-weight:600;color:#0f172a}
  .sign-role{font-size:10px;color:#94a3b8}

  /* ── Footer ── */
  .rp-footer{margin:24px 36px 0;border-top:1px solid #e2e8f0;padding:12px 0 28px;display:flex;justify-content:space-between;align-items:center}
  .rp-footer .left{font-size:10px;color:#94a3b8}
  .rp-footer .right{font-size:10px;color:#94a3b8;text-align:right}
  .rp-footer .watermark{font-size:9px;color:#cbd5e1;margin-top:2px}

  /* ── Multi-student (rekap) ── */
  .student-block{page-break-inside:avoid;page-break-after:always}
  .student-block:last-child{page-break-after:auto}
  .student-name-header{font-size:15px;font-weight:700;color:#0c4a6e;margin-bottom:2px}

  /* ── Cover page (rekap) ── */
  .cover-page{min-height:100vh;display:flex;flex-direction:column;background:linear-gradient(160deg,#0c4a6e 0%,#0369a1 50%,#0ea5e9 100%);position:relative;overflow:hidden;page-break-after:always}
  .cover-page::before{content:'';position:absolute;right:-120px;top:-120px;width:500px;height:500px;border-radius:50%;background:rgba(255,255,255,.05)}
  .cover-page::after{content:'';position:absolute;left:-80px;bottom:-80px;width:380px;height:380px;border-radius:50%;background:rgba(14,165,233,.2)}
  .cover-content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 48px;text-align:center}
  .cover-logo-circle{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:900;margin:0 auto 16px}
  .cover-brand{font-size:16px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.04em;margin-bottom:4px}
  .cover-divider{width:48px;height:2px;background:rgba(255,255,255,.3);margin:20px auto}
  .cover-doc{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.5);margin-bottom:12px}
  .cover-school{font-size:30px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:8px;line-height:1.1}
  .cover-period{font-size:15px;color:rgba(255,255,255,.75);margin-bottom:32px}
  .cover-stats{display:flex;gap:20px;justify-content:center}
  .cover-stat{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:16px 28px;text-align:center;backdrop-filter:blur(4px)}
  .cover-stat .num{font-size:32px;font-weight:800;color:#fff;line-height:1}
  .cover-stat .lbl{font-size:10px;font-weight:600;color:rgba(255,255,255,.6);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}
  .cover-footer{position:relative;z-index:1;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,.1)}
  .cover-footer span{font-size:10px;color:rgba(255,255,255,.45)}

  @media print{
    body{background:#fff}
    .page{min-height:auto}
    @page{margin:.5cm;size:A4}
  }
`;

function logoHtml(white = false, logoSrc?: string): string {
  const imgTag = logoSrc
    ? `<img src="${logoSrc}" alt="Logo" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid ${white ? "rgba(255,255,255,.4)" : "rgba(12,74,110,.3)"}" />`
    : `<div class="logo-circle"${white ? "" : ' style="background:#0c4a6e;border:none"'}>N</div>`;
  if (white) {
    return `<div class="logo-row">
      ${imgTag}
      <div><div class="brand">Next Swimming School</div><div class="brand-sub">Report Card</div></div>
    </div>`;
  }
  return `<div class="logo-row">
    ${imgTag}
    <div><div class="brand" style="color:#0c4a6e">Next Swimming School</div><div class="brand-sub" style="color:#64748b">Report Card</div></div>
  </div>`;
}

function studentBodyHtml(s: PrintStudent, showInfoGrid = true): string {
  const scoreEntries = Object.entries(s.scores);
  const hasContent   = scoreEntries.length > 0 || s.notes;
  const criteriaMap  = new Map((s.criteria ?? []).map(c => [c.id, c]));

  const scoreRows = scoreEntries.map(([key, val]) => {
    const crit  = criteriaMap.get(key);
    const label = crit?.label ?? key.replace(/_/g, " ");
    const kind  = crit?.kind ?? (typeof val === "number" && val <= 10 ? "score_10" : typeof val === "number" ? "score_100" : "text");
    return scoreRowHtml(label, val, kind);
  }).join("");

  const avg = overallPct(s.scores, s.criteria ?? []);
  const { grade, color, bg } = avg !== null ? gradeInfo(avg) : { grade: "—", color: "#94a3b8", bg: "#f8fafc" };

  return `
    ${showInfoGrid ? `
    <div class="info-section">
      <div class="info-grid">
        <div class="info-box"><div class="lbl">Nama Siswa</div><div class="val">${s.full_name}</div></div>
        <div class="info-box"><div class="lbl">Kelas</div><div class="val">${s.class_name}</div></div>
        <div class="info-box"><div class="lbl">Coach</div><div class="val">${s.coach_name}</div></div>
        <div class="info-box"><div class="lbl">Periode</div><div class="val">${s.period_label}</div></div>
      </div>
    </div>` : ""}

    ${avg !== null ? `
    <div class="overall-section">
      <div class="overall-card">
        <div class="overall-circle" style="border-color:${color};color:${color};background:${bg}">
          <div class="overall-grade">${grade}</div>
          <div class="overall-pct">${avg}%</div>
        </div>
        <div class="overall-text">
          <div class="title">Nilai Keseluruhan</div>
          <div class="sub">${avg >= 70 ? "Pencapaian yang baik! Pertahankan." : avg >= 40 ? "Ada ruang untuk berkembang lebih baik." : "Perlu perhatian dan latihan lebih intensif."}</div>
        </div>
      </div>
    </div>` : ""}

    <div class="scores-section">
      ${hasContent ? `
        <div class="section-title">Detail Penilaian</div>
        ${scoreRows}
        ${s.notes ? `<div class="section-title">Catatan Coach</div><div class="notes-box"><p>${s.notes}</p></div>` : ""}
      ` : `<div class="no-scores">Belum ada penilaian untuk periode ini.</div>`}
    </div>
  `;
}

/** Print a single student's rapor */
export function printSingleRapor(student: PrintStudent): void {
  const w = window.open("", "_blank", "width=780,height=1040");
  if (!w) return;
  const date = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });
  const logoSrc = `${window.location.origin}/logo.png`;

  w.document.write(`<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8">
    <title>Rapor — ${student.full_name}</title>
    <style>${SHARED_STYLES}</style>
  </head><body>
  <div class="page">
    <div class="rp-header">
      <div class="header-top">
        ${logoHtml(true, logoSrc)}
        <span class="doc-type">Rapor Siswa</span>
      </div>
      <div class="header-title">
        <h1>Rapor Perkembangan Siswa</h1>
        <p>${student.period_label} &nbsp;·&nbsp; ${student.class_name}</p>
      </div>
    </div>

    ${studentBodyHtml(student, true)}

    <div class="sign-section">
      <div class="sign-box">
        <div class="sign-label">Coach</div>
        <div class="sign-line">
          <div class="sign-name">${student.coach_name}</div>
          <div class="sign-role">Coach / Pelatih</div>
        </div>
      </div>
      <div class="sign-box">
        <div class="sign-label">Kepala Sekolah</div>
        <div class="sign-line">
          <div class="sign-name">Syahril Sidik</div>
          <div class="sign-role">Kepala Sekolah</div>
        </div>
      </div>
    </div>

    <div class="rp-footer">
      <div class="left">
        <div>Next Swimming School</div>
        <div class="watermark">Dokumen ini dicetak otomatis dari sistem.</div>
      </div>
      <div class="right">
        <div>Dicetak pada ${date}</div>
        <div class="watermark">${student.period_label}</div>
      </div>
    </div>
  </div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/** Print rekap rapor semua siswa sekolah afiliasi */
export function printSchoolRekap(schoolName: string, periodLabel: string, students: PrintStudent[]): void {
  const w = window.open("", "_blank", "width=780,height=1040");
  if (!w) return;
  const date = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });
  const logoSrc = `${window.location.origin}/logo.png`;
  const done = students.filter(s => Object.keys(s.scores).length > 0 || s.notes);

  const studentBlocks = students.map(s => `
    <div class="student-block">
      <div class="rp-header" style="padding:20px 36px 16px">
        <div class="header-top">
          ${logoHtml(true, logoSrc)}
          <span class="doc-type">Rapor Siswa</span>
        </div>
      </div>
      <div class="info-section" style="padding-top:16px">
        <div class="info-grid">
          <div class="info-box"><div class="lbl">Nama Siswa</div><div class="val">${s.full_name}</div></div>
          <div class="info-box"><div class="lbl">Kelas</div><div class="val">${s.class_name}</div></div>
          <div class="info-box"><div class="lbl">Coach</div><div class="val">${s.coach_name}</div></div>
          <div class="info-box"><div class="lbl">Sekolah</div><div class="val">${schoolName}</div></div>
        </div>
      </div>
      ${studentBodyHtml({ ...s, period_label: periodLabel }, false)}
      <div class="sign-section">
        <div class="sign-box">
          <div class="sign-label">Coach</div>
          <div class="sign-line">
            <div class="sign-name">${s.coach_name}</div>
            <div class="sign-role">Coach / Pelatih</div>
          </div>
        </div>
        <div class="sign-box">
          <div class="sign-label">Kepala Sekolah</div>
          <div class="sign-line">
            <div class="sign-name">Syahril Sidik</div>
            <div class="sign-role">Kepala Sekolah</div>
          </div>
        </div>
      </div>
      <div class="rp-footer">
        <div class="left"><div>Next Swimming School · ${schoolName}</div><div class="watermark">Dokumen ini dicetak otomatis dari sistem.</div></div>
        <div class="right"><div>Dicetak pada ${date}</div><div class="watermark">${periodLabel}</div></div>
      </div>
    </div>
  `).join("");

  w.document.write(`<!DOCTYPE html><html lang="id"><head>
    <meta charset="utf-8">
    <title>Rekap Rapor — ${schoolName}</title>
    <style>${SHARED_STYLES}</style>
  </head><body>

  <!-- Cover page -->
  <div class="cover-page">
    <div class="cover-content">
      <div class="cover-logo-circle"><img src="${logoSrc}" alt="Logo" style="width:48px;height:48px;border-radius:50%;object-fit:cover" onerror="this.style.display='none';this.parentNode.textContent='N'" /></div>
      <div class="cover-brand">Next Swimming School</div>
      <div class="cover-divider"></div>
      <div class="cover-doc">Rekap Rapor Perkembangan Siswa</div>
      <div class="cover-school">${schoolName}</div>
      <div class="cover-period">${periodLabel}</div>
      <div class="cover-stats">
        <div class="cover-stat">
          <div class="num">${students.length}</div>
          <div class="lbl">Total Siswa</div>
        </div>
        <div class="cover-stat">
          <div class="num">${done.length}</div>
          <div class="lbl">Rapor Tersedia</div>
        </div>
        <div class="cover-stat">
          <div class="num">${students.length - done.length}</div>
          <div class="lbl">Belum Diisi</div>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <span>Next Swimming School</span>
      <span>Dicetak pada ${date}</span>
    </div>
  </div>

  <!-- Per-student pages -->
  ${studentBlocks}

  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}
