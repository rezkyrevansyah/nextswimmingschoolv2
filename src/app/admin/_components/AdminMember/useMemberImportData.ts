"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { ClassRow, School } from "../../_types";
import type { ImportRow, ImportRowStatus, ValidatedRow } from "./_types";
import { parseImportDate, normalizeGender, normalizeMemberType, normalizeDayName, normalizeImportTime } from "./_utils";

export function useMemberImportData({
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
  const { t } = useLocale();

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
      const memberTypeRaw = r.tipe_member;
      const member_type = normalizeMemberType(memberTypeRaw) ?? "reguler";
      const birth_date = parseImportDate(r.tanggal_lahir);
      const gender = normalizeGender(r.jenis_kelamin);
      const phone = r.no_hp ? String(r.no_hp).trim() : undefined;
      const address = r.alamat ? String(r.alamat).trim() : undefined;
      const health_notes = r.catatan_kesehatan ? String(r.catatan_kesehatan).trim() : undefined;
      const nama_kelas_raw = r.nama_kelas ? String(r.nama_kelas).trim() : "";
      const nama_sekolah_raw = r.nama_sekolah ? String(r.nama_sekolah).trim() : "";
      const kelas_sekolah_raw = r.kelas_sekolah ? String(r.kelas_sekolah).trim() : "";

      if (!full_name) errors.push(t("admin.members.fullNameRequired2"));
      if (!email) errors.push(t("admin.members.emailRequiredImport"));
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(t("admin.members.invalidEmailFormat"));
      if (!password) errors.push(t("admin.members.passwordRequiredImport"));
      else if (password.length < 6) errors.push(t("admin.schoolPanel.passwordMinLength"));
      if (memberTypeRaw && !normalizeMemberType(memberTypeRaw)) errors.push(t("admin.members.invalidMemberType", { value: String(memberTypeRaw) }));
      if (r.tanggal_lahir && !birth_date) errors.push(t("admin.members.invalidBirthDateFormat", { value: String(r.tanggal_lahir) }));
      if (r.jenis_kelamin && !gender) errors.push(t("admin.members.invalidGenderFormat", { value: String(r.jenis_kelamin) }));

      let class_id: string | null | undefined = undefined;
      if (member_type !== "private" && nama_kelas_raw) {
        const found = classList.find(c => c.name.trim().toLowerCase() === nama_kelas_raw.toLowerCase());
        if (found) {
          class_id = found.id;
        } else {
          warnings.push(t("admin.members.classNotFoundWarning", { name: nama_kelas_raw }));
          class_id = null;
        }
      }

      let school_id: string | null | undefined = undefined;
      if (member_type === "school_affiliate") {
        if (!nama_sekolah_raw) {
          errors.push(t("admin.members.schoolNameRequiredImport"));
        } else {
          const found = schools.find(s => s.name.trim().toLowerCase() === nama_sekolah_raw.toLowerCase());
          if (found) {
            school_id = found.id;
          } else {
            errors.push(t("admin.members.schoolNotFoundError", { name: nama_sekolah_raw }));
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

      if (member_type === "private") {
        const sesiRaw = r.jumlah_sesi;
        total_sessions = sesiRaw != null && String(sesiRaw).trim() !== "" ? Math.round(Number(sesiRaw)) : null;
        if (total_sessions === null || isNaN(total_sessions)) errors.push(t("admin.members.sessionCountRequiredForPrivate"));

        const hargaRaw = r.harga_paket;
        package_price = hargaRaw != null && String(hargaRaw).trim() !== "" ? Math.round(Number(hargaRaw)) : null;

        const jadwalRaw = String(r.jadwal_hari ?? "").trim();
        if (!jadwalRaw) {
          errors.push(t("admin.members.scheduleDaysRequiredForPrivate"));
        } else {
          const tokens = jadwalRaw.split(",").map(d => d.trim()).filter(Boolean);
          const normalized = tokens.map(normalizeDayName);
          const invalidToken = tokens.find((_, idx) => !normalized[idx]);
          if (invalidToken) errors.push(t("admin.members.invalidScheduleDay", { value: invalidToken }));
          else schedule_days = normalized as string[];
        }

        time_start = normalizeImportTime(r.jam_mulai);
        if (!time_start) errors.push(t("admin.members.invalidStartTimeForPrivate", { value: String(r.jam_mulai ?? "") }));
        time_end = normalizeImportTime(r.jam_selesai);
        if (!time_end) errors.push(t("admin.members.invalidEndTimeForPrivate", { value: String(r.jam_selesai ?? "") }));

        const headPhone = r.coach_utama_hp ? String(r.coach_utama_hp).trim() : "";
        if (headPhone) {
          const found = findCoachByPhone(headPhone);
          if (found) head_coach_id = found.id;
          else { warnings.push(t("admin.members.coachNotFoundWarning", { value: headPhone })); head_coach_id = null; }
        }
        const assistantPhones = String(r.coach_asisten_hp ?? "").split(",").map(p => p.trim()).filter(Boolean);
        assistant_coach_ids = [];
        for (const p of assistantPhones) {
          const found = findCoachByPhone(p);
          if (found) assistant_coach_ids.push(found.id);
          else warnings.push(t("admin.members.coachNotFoundWarning", { value: p }));
        }
      }

      const status: ImportRowStatus = errors.length > 0 ? "error" : warnings.length > 0 ? "warn" : "ok";
      return {
        _rowNum: i + 2, _status: status, _errors: errors, _warnings: warnings,
        full_name, email, password, member_type, birth_date, gender, phone, address, health_notes,
        total_sessions, package_price, schedule_days, time_start, time_end, head_coach_id, assistant_coach_ids,
        class_id, school_id,
        school_grade: member_type === "school_affiliate" ? (kelas_sekolah_raw || null) : null,
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
      if (raw.length === 0) { toast.error(t("admin.members.fileEmptyTitle"), t("admin.members.fileEmptyBody")); return; }
      if (raw.length > 200) { toast.error(t("admin.members.tooManyRowsTitle"), t("admin.members.tooManyRowsBody")); return; }
      const validated = validateImportRows(raw, classes, schoolsList);
      setImportRows(validated);
      setImportPage(0);
      setImportStep("preview");
    } catch {
      toast.error(t("admin.members.readFileFailedTitle"), t("admin.members.readFileFailedBody"));
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ["nama_lengkap", "email", "password", "tipe_member", "tanggal_lahir", "jenis_kelamin", "no_hp", "alamat", "catatan_kesehatan", "jumlah_sesi", "harga_paket", "jadwal_hari", "jam_mulai", "jam_selesai", "coach_utama_hp", "coach_asisten_hp", "nama_kelas", "nama_sekolah", "kelas_sekolah"];
    const exampleRegular = ["Budi Santoso", "budi@gmail.com", "aqua2024", "reguler", "15/06/2010", "L", "08123456789", "Jl. Merdeka No. 1", "", "", "", "", "", "", "", "", "Kelas A Pagi", "", ""];
    const examplePrivate = ["Siti Aminah", "siti@gmail.com", "aqua2024", "private", "10/03/2015", "P", "08129876543", "Jl. Melati No. 5", "", "8", "1500000", "Senin,Rabu", "07:00", "08:00", "08111222333", "", "", "", ""];
    const notes = [
      t("admin.coaches.fieldFullName2"), t("admin.members.emailUniqueNote"), t("admin.members.min6CharsNote"),
      "reguler / private / afiliasi_sekolah", t("admin.members.dateFormatsNote"), t("admin.members.lOrPNote"),
      t("admin.izin.optionalHint2"), t("admin.izin.optionalHint2"), t("admin.izin.optionalHint2"),
      t("admin.members.requiredIfPrivateNote"), t("admin.members.optionalPrivateBillNote"),
      t("admin.members.scheduleDaysNote"), t("admin.members.startTimeNote"), t("admin.members.endTimeNote"),
      t("admin.members.headCoachPhoneNote"), t("admin.members.assistantCoachPhoneNote"),
      t("admin.members.mustMatchClassNameExactly"), t("admin.members.mandatoryIfSchoolAffiliateNote"),
      t("admin.members.schoolGradeOptionalNote"),
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRegular, examplePrivate, notes]);
    ws["!cols"] = headers.map((_, i) => ({ wch: [20, 28, 14, 20, 16, 14, 16, 28, 24, 12, 12, 18, 12, 12, 16, 18, 20, 24, 18][i] }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Import");
    XLSX.writeFile(wb, "template-import-member.xlsx");
  };

  const runImport = async () => {
    const toImport = importRows.filter(r => r._status !== "error");
    if (toImport.length === 0) return;
    const ok = await confirm({ title: t("admin.members.importConfirmTitle"), body: t("admin.members.importConfirmBody", { count: toImport.length }) });
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
        const res = await fetch("/api/admin/import-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branch_id: branchId,
            rows: chunk.map(r => ({
              email: r.email, password: r.password, full_name: r.full_name,
              member_type: r.member_type, birth_date: r.birth_date, gender: r.gender,
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
          toast.error(t("admin.members.importStoppedTitle"), (json as { error?: string }).error ?? t("admin.members.genericErrorOccurred"));
          break;
        }
        totalSuccess += json.success;
        allFailed.push(...json.failed);
        allClassWarnings.push(...(json.classWarnings ?? []));
        setImportProgress({ done: Math.min(i + CHUNK, toImport.length), total: toImport.length });
      }
    } catch {
      toast.error(t("admin.members.importFailedTitle"), t("admin.members.networkErrorOccurred"));
    }

    setImportResult({ success: totalSuccess, failed: allFailed, classWarnings: allClassWarnings });
    setImportStep("result");
    setImporting(false);
    setImportProgress(null);
    load();
  };

  return {
    t,
    openImport, setOpenImport, importStep, setImportStep, importRows, setImportRows,
    importPage, setImportPage, importing, importProgress, importResult, setImportResult,
    handleExcelFile, downloadTemplate, runImport,
  };
}
