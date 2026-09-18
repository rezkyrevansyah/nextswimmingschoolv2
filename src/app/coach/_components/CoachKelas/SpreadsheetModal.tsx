"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { createClient } from "@/utils/supabase/client";

export default function SpreadsheetModal({ classId, className, coachId, currentUrl, onClose, onSaved }: {
  classId: string; className: string; coachId: string; currentUrl?: string | null; onClose: () => void; onSaved?: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [url, setUrl] = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = url.trim();
    if (!trimmed) return toast.error("Enter the spreadsheet link first");
    setSaving(true);
    // Upsert per-coach entry
    const { error } = await supabase
      .from("class_coach_spreadsheets")
      .upsert(
        { class_id: classId, coach_id: coachId, spreadsheet_url: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "class_id,coach_id" }
      );
    if (error) { setSaving(false); return toast.error("Failed to save", error.message); }
    // Keep classes.spreadsheet_filled in sync (aggregate: any coach filled = true)
    await supabase.from("classes").update({ spreadsheet_filled: true }).eq("id", classId);
    setSaving(false);
    toast.success("Spreadsheet link saved");
    onSaved?.();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Program Spreadsheet — ${className}`} size="md"
      footer={<><Btn variant="ghost" onClick={onClose}>{"Cancel"}</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn></>}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800 leading-relaxed">
          {"Create the class program spreadsheet in Google Sheets, then paste its link here. Make sure the link is accessible to anyone with the link."}
        </div>
        <Field label={"Google Sheets / Spreadsheet Link"}>
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
            {"Open current spreadsheet"}
          </a>
        )}
      </div>
    </Modal>
  );
}
