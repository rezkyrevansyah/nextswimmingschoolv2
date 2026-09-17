"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select } from "@/components/ui/FormFields";
import { SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import Modal from "@/components/ui/Modal";
import { fmtDate, cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import PayslipGenerator from "../payroll/PayslipGenerator";
import type { Branch } from "../_types";

interface InvoicePeriod {
  id: string;
  branch_id: string | null;
  label: string;
  date_from: string;
  date_to: string;
  is_open: boolean;
  branch?: { name: string } | null;
}

export default function OwnerInvoices({ branches, userId, userName }: { branches: Branch[]; userId: string; userName: string }) {
  const { t, tNode } = useLocale();
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [subTab, setSubTab] = useState<"invoices" | "periods">("invoices");
  const [branchFilter, setBranchFilter] = useState("all");

  // Periods state
  const [periods, setPeriods] = useState<InvoicePeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [openAddPeriod, setOpenAddPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({ label: "", branch_id: "", date_from: "", date_to: "" });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [editPeriodTarget, setEditPeriodTarget] = useState<InvoicePeriod | null>(null);
  const [editPeriodForm, setEditPeriodForm] = useState({ label: "", branch_id: "", date_from: "", date_to: "" });
  const [savingEditPeriod, setSavingEditPeriod] = useState(false);

  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    const q = supabase
      .from("invoice_periods")
      .select("id, branch_id, label, date_from, date_to, is_open, branch:branches(name)")
      .order("date_from", { ascending: false });
    if (branchFilter !== "all") {
      q.or(`branch_id.eq.${branchFilter},branch_id.is.null`);
    }
    const { data } = await q;
    if (data) setPeriods(data as unknown as InvoicePeriod[]);
    setPeriodsLoading(false);
  }, [branchFilter, supabase]);

  useEffect(() => {
    if (subTab === "periods") {
      loadPeriods();
    }
  }, [subTab, loadPeriods]);

  const createPeriod = async () => {
    if (!periodForm.label.trim() || !periodForm.date_from || !periodForm.date_to) {
      return toast.error("All period fields are required");
    }
    setSavingPeriod(true);
    const { error } = await supabase.from("invoice_periods").insert({
      label: periodForm.label.trim(),
      branch_id: periodForm.branch_id || null,
      date_from: periodForm.date_from,
      date_to: periodForm.date_to,
      is_open: true,
      created_by: userId || null,
    });
    setSavingPeriod(false);
    if (error) return toast.error(t("owner.invoices.saveFailed"), error.message);
    toast.success(t("owner.invoices.periodCreatedToast"));
    setOpenAddPeriod(false);
    loadPeriods();
  };

  const closePeriod = async (id: string) => {
    const ok = await confirm({
      title: t("owner.invoices.closePeriodConfirmTitle"),
      body: t("owner.invoices.closePeriodConfirmBody"),
      confirmLabel: t("owner.invoices.closePeriodConfirmLabel"),
      danger: true,
    });
    if (!ok) return;
    await supabase.from("invoice_periods").update({ is_open: false }).eq("id", id);
    toast.success(t("owner.invoices.periodClosedToast"));
    loadPeriods();
  };

  const reopenPeriod = async (id: string) => {
    await supabase.from("invoice_periods").update({ is_open: true }).eq("id", id);
    toast.success(t("owner.invoices.periodReopenedToast"));
    loadPeriods();
  };

  const openEditPeriodModal = (p: InvoicePeriod) => {
    setEditPeriodTarget(p);
    setEditPeriodForm({
      label: p.label,
      branch_id: p.branch_id ?? "",
      date_from: p.date_from,
      date_to: p.date_to,
    });
  };

  const saveEditPeriod = async () => {
    if (!editPeriodTarget) return;
    if (!editPeriodForm.label.trim() || !editPeriodForm.date_from || !editPeriodForm.date_to) {
      return toast.error("All period fields are required");
    }
    setSavingEditPeriod(true);
    const { error } = await supabase.from("invoice_periods").update({
      label: editPeriodForm.label.trim(),
      branch_id: editPeriodForm.branch_id || null,
      date_from: editPeriodForm.date_from,
      date_to: editPeriodForm.date_to,
      updated_at: new Date().toISOString(),
    }).eq("id", editPeriodTarget.id);
    setSavingEditPeriod(false);
    if (error) return toast.error(t("owner.invoices.saveFailed"), error.message);
    toast.success(t("owner.invoices.periodUpdatedToast"));
    setEditPeriodTarget(null);
    loadPeriods();
  };

  const activePeriod = periods.find(p => p.is_open);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink">{t("owner.invoices.pageTitle")}</h2>
          <p className="text-ink-mute text-sm mt-0.5">{t("owner.invoices.pageSub")}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubTab("invoices")}
              className={cn(
                "h-10 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                subTab === "invoices"
                  ? "bg-ocean-600 text-white shadow-xs"
                  : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
              )}
            >
              {t("owner.invoices.tabInvoicesList")}
            </button>
            <button
              type="button"
              onClick={() => { setSubTab("periods"); loadPeriods(); }}
              className={cn(
                "h-10 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                subTab === "periods"
                  ? "bg-ocean-600 text-white shadow-xs"
                  : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
              )}
            >
              {t("owner.invoices.tabPeriods")}
            </button>
          </div>
          {subTab === "periods" && (
            <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="!w-44">
              <option value="all">{t("owner.invoices.allBranches")}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
        </div>
      </div>

      {subTab === "invoices" ? (
        <PayslipGenerator branches={branches} userId={userId} userName={userName} />
      ) : (
        /* Periods Tab */
        <div className="space-y-6">
          {!activePeriod && !periodsLoading && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-warn-50 border border-warn-200/60 text-warn-800 text-xs">
              <Icon name="warning" className="w-4 h-4 text-warn-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                Belum ada periode invoice yang aktif. Pelatih/staff tidak dapat mengajukan invoice baru hingga periode dibuka. Riwayat invoice tetap dapat diakses.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <SectionTitle sub="Manage schedules and invoice submission deadlines for coaches.">
              Periode Pengiriman Invoice
            </SectionTitle>
            <Btn
              variant="primary"
              icon="plus"
              onClick={() => {
                setPeriodForm({ label: "", branch_id: branchFilter === "all" ? "" : branchFilter, date_from: "", date_to: "" });
                setOpenAddPeriod(true);
              }}
            >
              {t("owner.invoices.newPeriodBtn")}
            </Btn>
          </div>

          {/* Active Period Highlight */}
          {activePeriod && (
            <div className="bg-gradient-to-r from-ocean-600 to-ocean-700 text-white rounded-2xl border border-ocean-500/30 p-6 relative overflow-hidden shadow-xs">
              <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-wave-500/20 blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 text-ocean-100 text-xs font-bold uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-ok-400 animate-pulse" /> {t("owner.invoices.periodStatusOpen")}
                </div>
                <div className="mt-2 font-display font-extrabold text-2xl lg:text-3xl"><NoTranslate>{activePeriod.label}</NoTranslate></div>
                <div className="text-white/80 text-sm mt-1">
                  Mulai: {fmtDate(activePeriod.date_from)} · Batas Akhir: {fmtDate(activePeriod.date_to)}
                  {activePeriod.branch?.name ? <> (Center: <NoTranslate>{activePeriod.branch.name}</NoTranslate>)</> : " (All Centers Scope)"}
                </div>
                <div className="mt-5 flex items-center gap-2.5">
                  <button
                    onClick={() => openEditPeriodModal(activePeriod)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors cursor-pointer"
                  >
                    Edit Periode
                  </button>
                  <button
                    onClick={() => closePeriod(activePeriod.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition-colors cursor-pointer"
                  >
                    {t("owner.invoices.closePeriodBtn")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Periods Table / List */}
          <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
            <div className="h-9 bg-paper-deep border-b border-line px-5 flex items-center justify-between text-[10px] uppercase font-bold text-ink-faint tracking-wider">
              <span>PERIODE & SCOPE</span>
              <span>AKSI</span>
            </div>
            {periodsLoading ? (
              <div className="p-10 text-center text-ink-mute text-sm">{t("owner.invoices.loading")}</div>
            ) : periods.length === 0 ? (
              <div className="p-10 text-center text-ink-mute text-sm">{t("owner.invoices.noPeriodsYet")}</div>
            ) : (
              <div className="divide-y divide-line">
                {periods.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper-tint/60 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink"><NoTranslate>{p.label}</NoTranslate></span>
                        <Status kind={p.is_open ? "active" : "archived"}>
                          {p.is_open ? t("owner.invoices.periodStatusOpen") : t("owner.invoices.periodStatusClosed")}
                        </Status>
                      </div>
                      <div className="text-xs text-ink-mute mt-1">
                        {tNode("owner.invoices.periodRangeScope", { from: fmtDate(p.date_from), to: fmtDate(p.date_to), scope: p.branch?.name ?? t("owner.invoices.allCentersOption") })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditPeriodModal(p)}
                        className="w-8 h-8 rounded-lg border border-line bg-paper hover:bg-paper-deep flex items-center justify-center text-ink-mute hover:text-ink transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      {p.is_open ? (
                        <button
                          onClick={() => closePeriod(p.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-warn-200 bg-warn-50 text-warn-700 hover:bg-warn-100 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t("owner.invoices.closePeriodBtn")}
                        </button>
                      ) : (
                        <button
                          onClick={() => reopenPeriod(p.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-ok-200 bg-ok-50 text-ok-700 hover:bg-ok-100 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t("owner.invoices.reopenPeriodBtn")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Add Period */}
          <Modal
            open={openAddPeriod}
            onClose={() => setOpenAddPeriod(false)}
            title={t("owner.invoices.openPeriodModalTitle")}
            size="sm"
            footer={
              <>
                <Btn variant="ghost" onClick={() => setOpenAddPeriod(false)}>{t("common.actions.cancel")}</Btn>
                <Btn variant="primary" onClick={createPeriod} disabled={savingPeriod}>
                  {savingPeriod ? "Menyimpan..." : t("owner.invoices.newPeriodBtn")}
                </Btn>
              </>
            }
          >
            <div className="space-y-4">
              <Field label={t("owner.invoices.fieldPeriodLabel")} required>
                <Input
                  value={periodForm.label}
                  onChange={e => setPeriodForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={t("owner.invoices.fieldPeriodLabelPlaceholder")}
                />
              </Field>
              <Field label={t("owner.invoices.fieldCenter")}>
                <Select value={periodForm.branch_id} onChange={e => setPeriodForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{t("owner.invoices.allCentersOption")}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label={t("owner.invoices.fieldDateFrom")} required>
                <Input type="date" value={periodForm.date_from} onChange={e => setPeriodForm(f => ({ ...f, date_from: e.target.value }))} />
              </Field>
              <Field label={t("owner.invoices.fieldDateTo")} required>
                <Input type="date" value={periodForm.date_to} onChange={e => setPeriodForm(f => ({ ...f, date_to: e.target.value }))} />
              </Field>
            </div>
          </Modal>

          {/* Modal Edit Period */}
          <Modal
            open={!!editPeriodTarget}
            onClose={() => setEditPeriodTarget(null)}
            title={t("owner.invoices.editPeriodModalTitle")}
            size="sm"
            footer={
              <>
                <Btn variant="ghost" onClick={() => setEditPeriodTarget(null)}>{t("common.actions.cancel")}</Btn>
                <Btn variant="primary" onClick={saveEditPeriod} disabled={savingEditPeriod}>
                  {savingEditPeriod ? t("common.actions.saving") : t("common.actions.save")}
                </Btn>
              </>
            }
          >
            <div className="space-y-4">
              <Field label={t("owner.invoices.fieldPeriodLabel")} required>
                <Input
                  value={editPeriodForm.label}
                  onChange={e => setEditPeriodForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={t("owner.invoices.fieldPeriodLabelPlaceholder")}
                />
              </Field>
              <Field label={t("owner.invoices.fieldCenter")}>
                <Select value={editPeriodForm.branch_id} onChange={e => setEditPeriodForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">{t("owner.invoices.allCentersOption")}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
              <Field label={t("owner.invoices.fieldDateFrom")} required>
                <Input type="date" value={editPeriodForm.date_from} onChange={e => setEditPeriodForm(f => ({ ...f, date_from: e.target.value }))} />
              </Field>
              <Field label={t("owner.invoices.fieldDateTo")} required>
                <Input type="date" value={editPeriodForm.date_to} onChange={e => setEditPeriodForm(f => ({ ...f, date_to: e.target.value }))} />
              </Field>
            </div>
          </Modal>
        </div>
      )}

    </div>
  );
}
