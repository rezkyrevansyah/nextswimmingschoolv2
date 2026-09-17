"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { createClient } from "@/utils/supabase/client";

export default function SpreadsheetModal({ classId, className, coachId, currentUrl, onClose, onSaved }: {
  classId: string; className: string; coachId: string; currentUrl?: string | null; onClose: () => void; onSaved?: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const { t } = useLocale();
  const [url, setUrl] = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = url.trim();
    if (!trimmed) return toast.error(t("coach.kelas.spreadsheetLinkRequired"));
    setSaving(true);
    // Upsert per-coach entry
    const { error } = await supabase
      .from("class_coach_spreadsheets")
      .upsert(
        { class_id: classId, coach_id: coachId, spreadsheet_url: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "class_id,coach_id" }
      );
    if (error) { setSaving(false); return toast.error(t("coach.absen.saveFailed"), error.message); }
    // Keep classes.spreadsheet_filled in sync (aggregate: any coach filled = true)
    await supabase.from("classes").update({ spreadsheet_filled: true }).eq("id", classId);
    setSaving(false);
    toast.success(t("coach.kelas.spreadsheetLinkSaved"));
    onSaved?.();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={t("coach.kelas.spreadsheetModalTitle", { className })} size="md"
      footer={<><Btn variant="ghost" onClick={onClose}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? t("coach.absen.savingBtn") : t("coach.kelas.saveBtn")}</Btn></>}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800 leading-relaxed">
          {t("coach.kelas.spreadsheetHint")}
        </div>
        <Field label={t("coach.kelas.spreadsheetFieldLabel")}>
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            type="url"
          />
        </Field>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-ocean-600 hover:text-ocean-800 font-semibold">
            <Icon name="link" className="w-3.5 h-3.5" />
            {t("coach.kelas.openCurrentSpreadsheetLink")}
          </a>
        )}
      </div>
    </Modal>
  );
}
