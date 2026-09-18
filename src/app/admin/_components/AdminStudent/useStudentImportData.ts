"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import type { ClassRow, School } from "../../_types";
import type { ImportRow, ImportRowStatus, ValidatedRow } from "./_types";
import { parseImportDate, normalizeGender, normalizeStudentType, normalizeDayName, normalizeImportTime } from "./_utils";

export function useStudentImportData({
  branchId, classes, schoolsList, findCoachByPhone, load,
}: {
  branchId: string;
  classes: ClassRow[];
  schoolsList: School[];
  findCoachByPhone: (phone: string) => { id: string; phone: string | null } | undefined;
  load: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [openImport, setOpenImport] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "preview" | "result">("upload");
  const [importRows, setImportRows] = useState<ValidatedRow[]>([]);
  const [importPage, setImportPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: { row: number; email: string; error: string }[]; classWarnings: { row: number; email: string; warning: string }[] } | null>(null);

  const validateImportRows = (raw: ImportRow[], classList: ClassRow[], schools: School[]): ValidatedRow[] => {
    return raw.map((r, i) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const full_name = String(r.nama_lengkap ?? "").trim();
      const email = String(r.email ?? "").trim();
      const password = String(r.password ?? "").trim();
      const studentTypeRaw = r.tipe_student;
      const student_type = normalizeStudentType(studentTypeRaw) ?? "reguler";
      const birth_date = parseImportDate(r.tanggal_lahir);
      const gender = normalizeGender(r.jenis_kelamin);
      const phone = r.no_hp ? String(r.no_hp).trim() : undefined;
      const address = r.alamat ? String(r.alamat).trim() : undefined;
      const health_notes = r.catatan_kesehatan ? String(r.catatan_kesehatan).trim() : undefined;
      const nama_kelas_raw = r.nama_kelas ? String(r.nama_kelas).trim() : "";
      const nama_sekolah_raw = r.nama_sekolah ? String(r.nama_sekolah).trim() : "";
      const kelas_sekolah_raw = r.kelas_sekolah ? String(r.kelas_sekolah).trim() : "";

      if (!full_name) errors.push("Full name is required");
      if (!email) errors.push("Email is required");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format");
      if (!password) errors.push("Password is required");
      else if (password.length < 6) errors.push("Password must be at least 6 characters");
      if (studentTypeRaw && !normalizeStudentType(studentTypeRaw)) errors.push(`Invalid student type: "${String(studentTypeRaw)}". Use: reguler, private, or afiliasi_sekolah`);
      if (r.tanggal_lahir && !birth_date) errors.push(`Invalid date of birth format: "${String(r.tanggal_lahir)}". Use DD/MM/YYYY`);
      if (r.jenis_kelamin && !gender) errors.push(`Invalid gender: "${String(r.jenis_kelamin)}". Use L or P`);

      let class_id: string | null | undefined = undefined;
      if (student_type !== "private" && nama_kelas_raw) {
        const found = classList.find(c => c.name.trim().toLowerCase() === nama_kelas_raw.toLowerCase());
        if (found) {
          class_id = found.id;
        } else {
          warnings.push(`Class "${nama_kelas_raw}" not found. Student will be created without a class.`);
          class_id = null;
        }
      }

      let school_id: string | null | undefined = undefined;
      if (student_type === "school_affiliate") {
        if (!nama_sekolah_raw) {
          errors.push("School name is required for school-affiliate type");
        } else {
          const found = schools.find(s => s.name.trim().toLowerCase() === nama_sekolah_raw.toLowerCase());
          if (found) {
            school_id = found.id;
          } else {
            errors.push(`School "${nama_sekolah_raw}" not found in the system. Make sure the school name matches exactly.`);
            school_id = null;
          }
        }
      }

      let total_sessions: number | null = null;
      let package_price: number | null = null;
      let schedule_days: string[] | undefined = undefined;
      let time_start: string | undefined = undefined;
      let time_end: string | undefined = undefined;
      let head_coach_id: string | null | undefined = undefined;
      let assistant_coach_ids: string[] | undefined = undefined;

      if (student_type === "private") {
        const sesiRaw = r.jumlah_sesi;
        total_sessions = sesiRaw != null && String(sesiRaw).trim() !== "" ? Math.round(Number(sesiRaw)) : null;
        if (total_sessions === null || isNaN(total_sessions)) errors.push("Number of sessions (numeric) is required for private type");

        const hargaRaw = r.harga_paket;
        package_price = hargaRaw != null && String(hargaRaw).trim() !== "" ? Math.round(Number(hargaRaw)) : null;

        const jadwalRaw = String(r.jadwal_hari ?? "").trim();
        if (!jadwalRaw) {
          errors.push("Schedule days (jadwal_hari) are required for private students");
        } else {
          const tokens = jadwalRaw.split(",").map(d => d.trim()).filter(Boolean);
          const normalized = tokens.map(normalizeDayName);
          const invalidToken = tokens.find((_, idx) => !normalized[idx]);
          if (invalidToken) errors.push(`Invalid schedule day: "${invalidToken}". Use: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, or Minggu`);
          else schedule_days = normalized as string[];
        }

        time_start = normalizeImportTime(r.jam_mulai);
        if (!time_start) errors.push(`Invalid start time: "${String(r.jam_mulai ?? "")}". Use HH:MM, e.g. 07:00`);
        time_end = normalizeImportTime(r.jam_selesai);
        if (!time_end) errors.push(`Invalid end time: "${String(r.jam_selesai ?? "")}". Use HH:MM, e.g. 08:00`);

        const headPhone = r.coach_utama_hp ? String(r.coach_utama_hp).trim() : "";
        if (headPhone) {
          const found = findCoachByPhone(headPhone);
          if (found) head_coach_id = found.id;
          else { warnings.push(`Coach with phone "${headPhone}" not found — the student will be created without that coach assigned`); head_coach_id = null; }
        }
        const assistantPhones = String(r.coach_asisten_hp ?? "").split(",").map(p => p.trim()).filter(Boolean);
        assistant_coach_ids = [];
        for (const p of assistantPhones) {
          const found = findCoachByPhone(p);
          if (found) assistant_coach_ids.push(found.id);
          else warnings.push(`Coach with phone "${p}" not found — the student will be created without that coach assigned`);
        }
      }

      const status: ImportRowStatus = errors.length > 0 ? "error" : warnings.length > 0 ? "warn" : "ok";
      return {
        _rowNum: i + 2, _status: status, _errors: errors, _warnings: warnings,
        full_name, email, password, student_type, birth_date, gender, phone, address, health_notes,
        total_sessions, package_price, schedule_days, time_start, time_end, head_coach_id, assistant_coach_ids,
        class_id, school_id,
        school_grade: student_type === "school_affiliate" ? (kelas_sekolah_raw || null) : null,
        nama_kelas_raw, nama_sekolah_raw,
      };
    });
  };

  const handleExcelFile = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false, raw: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "", raw: true });
      if (raw.length === 0) { toast.error("File is empty", "No data rows found."); return; }
      if (raw.length > 200) { toast.error("Too many rows", "Maximum 200 students per import."); return; }
      const validated = validateImportRows(raw, classes, schoolsList);
      setImportRows(validated);
      setImportPage(0);
      setImportStep("preview");
    } catch {
      toast.error("Failed to read file", "Make sure the file is .xlsx, .xls, or .csv format.");
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ["nama_lengkap", "email", "password", "tipe_student", "tanggal_lahir", "jenis_kelamin", "no_hp", "alamat", "catatan_kesehatan", "jumlah_sesi", "harga_paket", "jadwal_hari", "jam_mulai", "jam_selesai", "coach_utama_hp", "coach_asisten_hp", "nama_kelas", "nama_sekolah", "kelas_sekolah"];
    const exampleRegular = ["Budi Santoso", "budi@gmail.com", "aqua2024", "reguler", "15/06/2010", "L", "08123456789", "Jl. Merdeka No. 1", "", "", "", "", "", "", "", "", "Kelas A Pagi", "", ""];
    const examplePrivate = ["Siti Aminah", "siti@gmail.com", "aqua2024", "private", "10/03/2015", "P", "08129876543", "Jl. Melati No. 5", "", "8", "1500000", "Senin,Rabu", "07:00", "08:00", "08111222333", "", "", "", ""];
    const notes = [
      "Full name", "Unique email", "Min. 6 characters",
      "reguler / private / afiliasi_sekolah", "DD/MM/YYYY or YYYY-MM-DD", "L or P",
      "Optional", "Optional", "Optional",
      "Required if type=private", "Optional — package price, creates a bill for private students",
      "Required if type=private — comma-separated, e.g. Senin,Rabu", "Required if type=private — HH:MM, e.g. 07:00", "Required if type=private — HH:MM, e.g. 08:00",
      "Optional — head coach's phone number", "Optional — assistant coach phone number(s), comma-separated",
      "Must match the class name exactly", "MANDATORY if type=afiliasi_sekolah",
      "Optional — the child's grade/class at their day school, e.g. \"Kelas 5 SD\"",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRegular, examplePrivate, notes]);
    ws["!cols"] = headers.map((_, i) => ({ wch: [20, 28, 14, 20, 16, 14, 16, 28, 24, 12, 12, 18, 12, 12, 16, 18, 20, 24, 18][i] }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Import");
    XLSX.writeFile(wb, "template-import-student.xlsx");
  };

  const runImport = async () => {
    const toImport = importRows.filter(r => r._status !== "error");
    if (toImport.length === 0) return;
    const ok = await confirm({ title: "Confirm Import", body: `This will import ${toImport.length} students. This process cannot be undone. Continue?` });
    if (!ok) return;

    const CHUNK = 10;
    const allFailed: { row: number; email: string; error: string }[] = [];
    const allClassWarnings: { row: number; email: string; warning: string }[] = [];
    let totalSuccess = 0;

    setImporting(true);
    setImportProgress({ done: 0, total: toImport.length });

    try {
      for (let i = 0; i < toImport.length; i += CHUNK) {
        const chunk = toImport.slice(i, i + CHUNK);
        const res = await fetch("/api/admin/import-students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: branchId,
            rows: chunk.map(r => ({
              email: r.email, password: r.password, full_name: r.full_name,
              student_type: r.student_type, birth_date: r.birth_date, gender: r.gender,
              phone: r.phone, address: r.address, health_notes: r.health_notes,
              total_sessions: r.total_sessions, class_id: r.class_id,
              school_id: r.school_id ?? null,
              school_grade: r.school_grade ?? null,
              package_price: r.package_price ?? null,
              schedule_days: r.schedule_days ?? null,
              time_start: r.time_start ?? null,
              time_end: r.time_end ?? null,
              head_coach_id: r.head_coach_id ?? null,
              assistant_coach_ids: r.assistant_coach_ids ?? null,
            })),
          }),
        });
        const json = await res.json() as { success: number; failed: { row: number; email: string; error: string }[]; classWarnings?: { row: number; email: string; warning: string }[] };
        if (!res.ok) {
          toast.error("Import stopped", (json as { error?: string }).error ?? "An error occurred.");
          break;
        }
        totalSuccess += json.success;
        allFailed.push(...json.failed);
        allClassWarnings.push(...(json.classWarnings ?? []));
        setImportProgress({ done: Math.min(i + CHUNK, toImport.length), total: toImport.length });
      }
    } catch {
      toast.error("Import failed", "A network error occurred.");
    }

    setImportResult({ success: totalSuccess, failed: allFailed, classWarnings: allClassWarnings });
    setImportStep("result");
    setImporting(false);
    setImportProgress(null);
    load();
  };

  return {
    openImport, setOpenImport, importStep, setImportStep, importRows, setImportRows,
    importPage, setImportPage, importing, importProgress, importResult, setImportResult,
    handleExcelFile, downloadTemplate, runImport,
  };
}
