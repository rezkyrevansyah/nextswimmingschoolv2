"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { downloadRaporPdf } from "@/lib/printRapor";
import { downloadRaporZip } from "@/lib/downloadRaporZip";
import type { Student } from "../_types";
import type { useSchoolRaporData } from "./useSchoolRaporData";

export function useSchoolRaporExport(data: ReturnType<typeof useSchoolRaporData>) {
  const toast = useToast();
  const { students, filteredSorted, selected, schoolName, branchName } = data;

  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null);

  const toPrintStudent = (s: Student) => ({
    student_id: s.id, period_id: s.period_id ?? undefined,
    full_name: s.full_name, avatar_url: s.avatar_url ?? undefined,
    student_no: s.student_no ?? undefined, birth_date: s.birth_date ?? undefined,
    location: branchName || undefined,
    level: s.level ?? undefined,
    class_name: s.class_name, coach_name: s.coach_name,
    coach_signature_url: s.coach_signature_url,
    school_logo_url: s.school_logo_url,
    signatures: s.signatures,
    period_label: s.period_label ?? "—", scores: s.scores, notes: s.notes,
    personality: s.personality, motivation: s.motivation, learning_achievements: s.learning_achievements,
    criteria: s.criteria, best_times: s.best_times,
    level_strokes: s.level_strokes, level_distances: s.level_distances,
  });

  const downloadZipFor = async (targets: Student[]) => {
    if (targets.length === 0) return;
    setBulkDownloading(true);
    setDownloadProgress({ done: 0, total: targets.length });
    try {
      const zipName = `rapor-${schoolName.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}`;
      const { success, failed } = await downloadRaporZip(
        targets.map(toPrintStudent),
        zipName,
        (done, total) => setDownloadProgress({ done, total })
      );
      if (failed === 0) toast.success("ZIP downloaded successfully");
      else if (success === 0) toast.error("Failed to download ZIP");
      else toast.error(`${success} succeeded, ${failed} failed`);
    } catch {
      toast.error("Failed to download ZIP");
    } finally {
      setBulkDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handlePrintAll = () => void downloadZipFor(students.filter(s => s.is_filled));
  const handlePrintOne = async (s: Student) => {
    setDownloadingId(s.id);
    try {
      await downloadRaporPdf(toPrintStudent(s));
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };
  const handlePrintSelected = () => void downloadZipFor(students.filter(s => selected.has(s.id) && s.is_filled));
  const handlePrintFiltered = () => void downloadZipFor(filteredSorted.filter(s => s.is_filled));
  const bulkDownloadingLabel = downloadProgress
    ? `Generating… (${downloadProgress.done}/${downloadProgress.total})`
    : "Generating ZIP…";

  return {
    bulkDownloading, downloadingId, downloadProgress, bulkDownloadingLabel,
    toPrintStudent, handlePrintAll, handlePrintOne, handlePrintSelected, handlePrintFiltered,
  };
}
