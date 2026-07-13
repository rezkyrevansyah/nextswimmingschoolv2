/**
 * Bulk rapor PDF download — fetches one PDF per student from the existing
 * /api/rapor/pdf route (no new server endpoint) and bundles them into a ZIP.
 * Concurrency-limited so we don't fire 50 Puppeteer requests at once.
 */
import { downloadRaporPdf, sanitizeFilename, type PrintStudent } from "./printRapor";

const CONCURRENCY = 3;

async function fetchStudentPdf(student: PrintStudent): Promise<ArrayBuffer> {
  const res = await fetch("/api/rapor/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });
  if (!res.ok) throw new Error(`PDF API error: ${res.status}`);
  return res.arrayBuffer();
}

export interface DownloadRaporZipResult {
  success: number;
  failed: number;
}

/**
 * Download rapor PDFs for multiple students as a single ZIP file.
 * If only one student is passed, downloads a plain PDF instead (no ZIP).
 */
export async function downloadRaporZip(
  students: PrintStudent[],
  zipFilename: string,
  onProgress?: (done: number, total: number) => void
): Promise<DownloadRaporZipResult> {
  if (students.length === 0) return { success: 0, failed: 0 };
  if (students.length === 1) {
    await downloadRaporPdf(students[0]);
    return { success: 1, failed: 0 };
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const usedNames = new Map<string, number>();
  let success = 0;
  let failed = 0;
  let done = 0;

  let cursor = 0;
  const worker = async () => {
    while (cursor < students.length) {
      const student = students[cursor++];
      try {
        const buf = await fetchStudentPdf(student);
        const base = sanitizeFilename(student.full_name);
        const dupeCount = usedNames.get(base) ?? 0;
        usedNames.set(base, dupeCount + 1);
        const filename = dupeCount === 0 ? `rapor-${base}.pdf` : `rapor-${base}-${dupeCount + 1}.pdf`;
        zip.file(filename, buf);
        success++;
      } catch {
        failed++;
      } finally {
        done++;
        onProgress?.(done, students.length);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, students.length) }, worker));

  if (success > 0) {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFilename.endsWith(".zip") ? zipFilename : `${zipFilename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { success, failed };
}
