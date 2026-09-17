import QRCode from "qrcode";
import JSZip from "jszip";

export interface QRCardAccount {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role: string;
  custom_role_label?: string | null;
  user_no?: string | null;
  qr_code?: string | null;
  avatar_url?: string | null;
  branch?: { id?: string; name: string } | null;
  branch_name?: string | null;
  member_no?: string | null;
  member_type?: string | null;
  phone?: string | null;
}

/**
 * Generates a clean, sanitized filename for downloading QR images based on account data:
 * Format: [ROLE]_[NAME]_[USER_NO or BRANCH].png
 * Example: MEMBER_Rezky-Revansyah_NSS-M-008.png
 */
export function formatQRFileName(account: QRCardAccount): string {
  const role = (account.role || "USER").toUpperCase();
  const rawName = account.full_name?.trim() || account.email?.split("@")[0] || "Account";
  const safeName = rawName
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const idCode =
    account.member_no ||
    account.user_no ||
    (account.branch?.name ?? account.branch_name ?? "").replace(/\s+/g, "-") ||
    account.id.slice(0, 8).toUpperCase();
  const safeIdCode = idCode.replace(/[^a-zA-Z0-9-]/g, "");

  return `${role}_${safeName}_${safeIdCode}`.slice(0, 80);
}

/**
 * Returns role badge color styling for canvas
 */
function getRoleBadgeColors(role: string): { bg: string; text: string; label: string } {
  switch (role) {
    case "owner":
      return { bg: "#7E22CE", text: "#FFFFFF", label: "OWNER" };
    case "admin":
      return { bg: "#0284C7", text: "#FFFFFF", label: "ADMIN" };
    case "coach":
      return { bg: "#0D9488", text: "#FFFFFF", label: "COACH" };
    case "member":
      return { bg: "#16A34A", text: "#FFFFFF", label: "STUDENT" };
    case "staff":
      return { bg: "#4F46E5", text: "#FFFFFF", label: "STAFF" };
    case "school":
      return { bg: "#D97706", text: "#FFFFFF", label: "SCHOOL" };
    default:
      return { bg: "#475569", text: "#FFFFFF", label: role.toUpperCase() };
  }
}

/**
 * Generates an elegant high-resolution Branded ID Card canvas
 * Width: 600px, Height: 850px
 */
export async function generateBrandedQRCardCanvas(
  account: QRCardAccount,
  qrValue: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const width = 600;
  const height = 850;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get canvas 2D context");

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#F8FAFC");
  bgGrad.addColorStop(1, "#EFF6FF");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Card Outer Border
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Inner card container
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(24, 24, width - 48, height - 48, 24);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Header Banner (Navy Ocean)
  const headerGrad = ctx.createLinearGradient(24, 24, width - 24, 150);
  headerGrad.addColorStop(0, "#0A2540");
  headerGrad.addColorStop(1, "#0284C7");
  ctx.fillStyle = headerGrad;
  ctx.beginPath();
  ctx.roundRect(24, 24, width - 48, 120, [24, 24, 0, 0]);
  ctx.fill();

  // Header Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NEXT SWIMMING SCHOOL", width / 2, 70);

  // Header Subtitle / Branch
  const branchName = account.branch?.name || account.branch_name || "Official Student Pass";
  ctx.fillStyle = "#93C5FD";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(branchName.toUpperCase(), width / 2, 105);

  // 3. Role Badge Pill
  const roleInfo = getRoleBadgeColors(account.role);
  const badgeLabel = account.custom_role_label ? `${roleInfo.label} · ${account.custom_role_label}` : roleInfo.label;
  ctx.font = "bold 14px sans-serif";
  const badgeTextWidth = ctx.measureText(badgeLabel).width;
  const badgeW = badgeTextWidth + 36;
  const badgeH = 32;
  const badgeX = (width - badgeW) / 2;
  const badgeY = 170;

  ctx.fillStyle = roleInfo.bg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
  ctx.fill();

  ctx.fillStyle = roleInfo.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeLabel, width / 2, badgeY + badgeH / 2);
  ctx.textBaseline = "alphabetic"; // reset

  // 4. Name
  const name = account.full_name?.trim() || account.email?.split("@")[0] || "User";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  // Trim long name if needed
  let displayName = name;
  if (ctx.measureText(displayName).width > width - 80) {
    while (displayName.length > 10 && ctx.measureText(displayName + "…").width > width - 80) {
      displayName = displayName.slice(0, -1);
    }
    displayName += "…";
  }
  ctx.fillText(displayName, width / 2, 245);

  // 5. Account Number / User No
  const userCode = account.member_no || account.user_no || qrValue;
  ctx.fillStyle = "#64748B";
  ctx.font = "600 16px monospace";
  ctx.fillText(`ID: ${userCode}`, width / 2, 275);

  // 6. QR Code in Box
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, qrValue, {
    width: 320,
    margin: 2,
    color: {
      dark: "#0A2540",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  const qrBoxX = (width - 340) / 2;
  const qrBoxY = 310;
  // White card with shadow border
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, 340, 340, 20);
  ctx.fill();
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw QR
  ctx.drawImage(qrCanvas, qrBoxX + 10, qrBoxY + 10, 320, 320);

  // 7. Footer Info
  ctx.fillStyle = "#334155";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("Scan untuk Presensi & Verifikasi", width / 2, 695);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "12px sans-serif";
  ctx.fillText(`Generated on ${new Date().toLocaleDateString("id-ID", { dateStyle: "medium" })}`, width / 2, 730);

  ctx.fillStyle = "#0284C7";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("www.nextswimmingschool.com", width / 2, 765);

  return canvas;
}

/**
 * Downloads a single Branded QR ID Card PNG with structured filename
 */
export async function downloadSingleQRCard(account: QRCardAccount, qrValue?: string): Promise<void> {
  const code = qrValue || account.qr_code || account.member_no || account.user_no || account.id;
  const canvas = await generateBrandedQRCardCanvas(account, code);
  const dataUrl = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${formatQRFileName(account)}.png`;
  a.click();
}

/**
 * Bundles multiple accounts into a single ZIP archive containing high-resolution
 * branded ID card PNGs with cleanly structured filenames.
 */
export async function downloadBulkQRZip(
  accounts: QRCardAccount[],
  zipFilename = `NEXT-QR-Cards-${new Date().toISOString().slice(0, 10)}.zip`,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (accounts.length === 0) return;

  const zip = new JSZip();
  const total = accounts.length;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const qrValue = acc.qr_code || acc.member_no || acc.user_no || acc.id;
    try {
      const canvas = await generateBrandedQRCardCanvas(acc, qrValue);
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      const filename = `${formatQRFileName(acc)}.png`;
      zip.file(filename, base64, { base64: true });
    } catch (err) {
      console.error(`Failed to generate QR card for ${acc.full_name}:`, err);
    }
    if (onProgress) onProgress(i + 1, total);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates and opens an A4 printable sheet popup window containing a grid of QR cards
 */
export async function printQRCardSheet(accounts: QRCardAccount[]): Promise<void> {
  if (accounts.length === 0) return;

  const cardsHtml: string[] = [];

  for (const acc of accounts) {
    const qrValue = acc.qr_code || acc.member_no || acc.user_no || acc.id;
    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      width: 180,
      margin: 1,
      color: { dark: "#0A2540", light: "#FFFFFF" },
    });

    const roleInfo = getRoleBadgeColors(acc.role);
    const badgeLabel = acc.custom_role_label ? `${roleInfo.label} · ${acc.custom_role_label}` : roleInfo.label;
    const name = acc.full_name?.trim() || acc.email?.split("@")[0] || "User";
    const userCode = acc.member_no || acc.user_no || qrValue;
    const branchName = acc.branch?.name || acc.branch_name || "NEXT Swimming School";

    cardsHtml.push(`
      <div class="qr-card">
        <div class="card-header">
          <div class="brand">NEXT SWIMMING SCHOOL</div>
          <div class="branch">${branchName}</div>
        </div>
        <div class="card-body">
          <span class="role-badge" style="background-color: ${roleInfo.bg}; color: ${roleInfo.text};">
            ${badgeLabel}
          </span>
          <div class="person-name">${name}</div>
          <div class="person-id">${userCode}</div>
          <div class="qr-wrapper">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-img" />
          </div>
          <div class="card-footer">Scan untuk Presensi & Verifikasi</div>
        </div>
      </div>
    `);
  }

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Lembar QR Code Akun - NEXT Swimming School</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        body {
          background-color: #F1F5F9;
          padding: 16px;
        }
        .no-print-bar {
          background-color: #0A2540;
          color: #FFFFFF;
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .print-btn {
          background-color: #0284C7;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
        }
        .print-btn:hover {
          background-color: #0369A1;
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12mm;
        }
        .qr-card {
          background: #FFFFFF;
          border: 1.5px dashed #94A3B8;
          border-radius: 14px;
          overflow: hidden;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .card-header {
          background: linear-gradient(135deg, #0A2540, #0284C7);
          color: white;
          padding: 10px 14px;
          text-align: center;
        }
        .brand {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .branch {
          font-size: 10px;
          color: #93C5FD;
          font-weight: 600;
          margin-top: 2px;
        }
        .card-body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
        }
        .role-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 10px;
          border-radius: 999px;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .person-name {
          font-size: 14px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 2px;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .person-id {
          font-size: 10px;
          font-family: monospace;
          color: #64748B;
          margin-bottom: 10px;
        }
        .qr-wrapper {
          padding: 6px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          background: #FFFFFF;
          margin-bottom: 8px;
        }
        .qr-img {
          display: block;
          width: 140px;
          height: 140px;
        }
        .card-footer {
          font-size: 9px;
          color: #64748B;
          font-weight: 600;
        }
        @media print {
          body {
            background: transparent;
            padding: 0;
          }
          .no-print-bar {
            display: none !important;
          }
          .qr-card {
            border: 1px dashed #CBD5E1;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong>Lembar Kartu Identitas & QR Code</strong> (${accounts.length} Akun)
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      </div>
      <div class="grid-container">
        ${cardsHtml.join("")}
      </div>
    </body>
    </html>
  `);
  win.document.close();
}
