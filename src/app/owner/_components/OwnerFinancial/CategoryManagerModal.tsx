"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import Modal from "@/components/ui/Modal";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { Input } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { ManualTxnCategory, ManualTxnRow } from "./_types";

export default function CategoryManagerModal({ kind, categories, manualTxns, onClose, onChanged }: {
  kind: "income" | "expense" | null;
  categories: ManualTxnCategory[];
  manualTxns: ManualTxnRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async () => {
    const name = newName.trim();
    if (!name || !kind) return;
    setSaving(true);
    const { error } = await supabase.from("manual_transaction_categories")
      .insert({ kind, name, sort_order: categories.length + 1 });
    setSaving(false);
    if (error) return toast.error(t("owner.financial.categorySaveFailed"), error.message);
    setNewName("");
    onChanged();
  };

  const startEdit = (c: ManualTxnCategory) => { setEditId(c.id); setEditName(c.name); };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name || !editId) return;
    setSaving(true);
    const { error } = await supabase.from("manual_transaction_categories").update({ name }).eq("id", editId);
    setSaving(false);
    if (error) return toast.error(t("owner.financial.categorySaveFailed"), error.message);
    setEditId(null);
    onChanged();
  };

  const del = async (c: ManualTxnCategory) => {
    const usageCount = manualTxns.filter(t => t.kind === c.kind && t.category === c.name).length;
    if (usageCount > 0) {
      toast.error(t("owner.financial.categoryInUseTitle"), t("owner.financial.categoryInUseBody", { count: usageCount }));
      return;
    }
    const ok = await confirm({ title: t("owner.financial.categoryDeleteConfirmTitle"), body: c.name, danger: true });
    if (!ok) return;
    const { error } = await supabase.from("manual_transaction_categories").delete().eq("id", c.id);
    if (error) return toast.error(t("owner.financial.categoryDeleteFailed"), error.message);
    onChanged();
  };

  return (
    <Modal open={!!kind} onClose={onClose}
      title={kind === "income" ? t("owner.financial.manageCategoriesIncomeTitle") : t("owner.financial.manageCategoriesExpenseTitle")}
      size="sm" footer={<Btn variant="ghost" onClick={onClose}>{t("common.actions.close")}</Btn>}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("owner.financial.categoryNamePlaceholder")}
            onKeyDown={e => { if (e.key === "Enter") add(); }} />
          <Btn variant="primary" size="sm" disabled={!newName.trim() || saving} onClick={add}>{t("common.actions.add")}</Btn>
        </div>
        <div className="space-y-1.5">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-paper-tint">
              {editId === c.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1"
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); }} autoFocus />
                  <button onClick={saveEdit} disabled={saving} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="check" className="w-3.5 h-3.5 text-ok-600" /></button>
                  <button onClick={() => setEditId(null)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="x" className="w-3.5 h-3.5 text-ink-mute" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold text-ink truncate"><NoTranslate>{c.name}</NoTranslate></span>
                  <button onClick={() => startEdit(c)} className="w-7 h-7 rounded-lg border border-line bg-white flex items-center justify-center hover:bg-paper-deep shrink-0"><Icon name="edit" className="w-3.5 h-3.5 text-ink-mute" /></button>
                  <button onClick={() => del(c)} className="w-7 h-7 rounded-lg border border-danger-200 bg-danger-50 flex items-center justify-center hover:bg-danger-100 shrink-0"><Icon name="trash" className="w-3.5 h-3.5 text-danger-500" /></button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <div className="py-6 text-center text-ink-mute text-sm">{t("owner.financial.categoryEmpty")}</div>}
        </div>
      </div>
    </Modal>
  );
}
