"use client";
import { useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Field } from "@/components/ui/FormFields";
import Icon from "@/components/ui/Icon";
import type { CompetitionDocumentRow } from "./_types";

// One certificate/document per (member, competition) — covers every category that member
// won at that event, so it's uploaded once here rather than repeated per achievement row.
export default function CompetitionDocUploader({
  competitionId,
  memberId,
  doc,
  onUploaded,
  onView,
}: {
  competitionId: string;
  memberId: string;
  doc: CompetitionDocumentRow | undefined;
  onUploaded: (doc: CompetitionDocumentRow) => void;
  onView: (doc: CompetitionDocumentRow) => void;
}) {
  const toast = useToast();
  const { t } = useLocale();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("competitionId", competitionId);
    fd.append("memberId", memberId);
    const res = await fetch("/api/upload/competition-doc", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({})) as { url?: string; content_type?: string; error?: string };
    setUploading(false);
    if (!res.ok || !json.url) {
      toast.error(t("admin.competition.docUploadFailed"), json.error);
      return;
    }
    toast.success(t("admin.competition.docUploadedSuccess"));
    onUploaded({ id: doc?.id ?? "", competition_id: competitionId, member_id: memberId, document_url: json.url, content_type: json.content_type ?? null });
  };

  return (
    <Field label={t("admin.competition.docFieldLabel")} hint={t("admin.competition.docFieldHint")}>
      <div className="flex items-center gap-2 flex-wrap">
        {doc && (
          <button
            type="button"
            onClick={() => onView(doc)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ocean-200 bg-ocean-50 text-ocean-700 text-xs font-semibold hover:bg-ocean-100 transition-colors"
          >
            <Icon name="eye" className="w-3.5 h-3.5" /> {t("admin.competition.docViewBtn")}
          </button>
        )}
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-paper-tint transition-colors">
          <Icon name={uploading ? "refresh" : "upload"} className={`w-3.5 h-3.5 ${uploading ? "animate-spin" : ""}`} />
          {uploading ? t("admin.competition.docUploadingBtn") : doc ? t("admin.competition.docChangeBtn") : t("admin.competition.docUploadBtn")}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>
    </Field>
  );
}
