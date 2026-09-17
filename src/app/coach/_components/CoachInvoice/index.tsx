"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR, fmtDate, fmtDateLong } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import type { DraftExtraItem, DraftReimburseItem, InvoiceSession, PastInvoice, ProfileData } from "../../_types";
import ReimburseModal from "./ReimburseModal";

export default function CoachInvoice({ coachId, branchId, profile }: { coachId: string; branchId: string; profile: ProfileData | null }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, locale } = useLocale();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const [sessions, setSessions] = useState<InvoiceSession[]>([]);
  const [pastInvoices, setPastInvoices] = useState<PastInvoice[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [activePeriod, setActivePeriod] = useState<{
    id: string;
    label: string;
    date_from: string;
    date_to: string;
  } | null>(null);
  const [checkingPeriod, setCheckingPeriod] = useState(true);

  const [extraRatePerSession, setExtraRatePerSession] = useState<number | null>(null);
  const [extraSessionCount, setExtraSessionCount] = useState("");
  const [extraItems, setExtraItems] = useState<DraftExtraItem[]>([]);
  const [reimburseItems, setReimburseItems] = useState<DraftReimburseItem[]>([]);
  const [showReimburseModal, setShowReimburseModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Check active invoice period
    const pQuery = supabase
      .from("invoice_periods")
      .select("id, label, date_from, date_to")
      .eq("is_open", true);
    if (branchId) {
      pQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
    }
    const { data: pData } = await pQuery.order("date_to", { ascending: true }).limit(1);
    const activeP = (pData && pData.length > 0 ? pData[0] : null) as { id: string; label: string; date_from: string; date_to: string } | null;
    setActivePeriod(activeP);
    setCheckingPeriod(false);

    const [y, m] = monthFilter.split("-");
    const start = `${y}-${m}-01`;
    const end = new Date(parseInt(y), parseInt(m), 0).toISOString().split("T")[0];

    const { data: att } = await supabase.from("coach_attendances")
      .select("id, session_date, class_id, class:classes(id, name)")
      .eq("coach_id", coachId).in("status", ["present", "late"])
      .gte("session_date", start).lte("session_date", end)
      .is("invoice_id", null);

    if (att) {
      const classIds = [...new Set(att.map((a: Record<string, unknown>) => a.class_id as string).filter(Boolean))];
      // Fetch both: tarif khusus for this coach AND tarif umum (coach_id null)
      const { data: rates } = classIds.length > 0
        ? await supabase.from("coach_rates").select("class_id, coach_id, rate_per_session")
            .in("class_id", classIds as string[])
            .or(`coach_id.eq.${coachId},coach_id.is.null`)
        : { data: [] };

      // Build rateMap: tarif khusus overrides tarif umum
      const generalMap: Record<string, number> = {};
      const coachMap: Record<string, number> = {};
      (rates ?? []).forEach((r: { class_id: string; coach_id: string | null; rate_per_session: number | null }) => {
        if (r.rate_per_session == null) return;
        if (!r.coach_id) generalMap[r.class_id] = r.rate_per_session;
        else coachMap[r.class_id] = r.rate_per_session;
      });
      // Tarif khusus takes priority, fallback to tarif umum, then null (no rate set)
      const rateMap: Record<string, number | null> = {};
      classIds.forEach(id => { rateMap[id] = coachMap[id] ?? generalMap[id] ?? null; });

      const sessionsWithRate = att.map((a: Record<string, unknown>) => {
        const cls = a.class as { id?: string; name?: string } | null;
        const classId = a.class_id as string;
        return {
          id: a.id as string,
          session_date: a.session_date as string,
          class_id: classId,
          rate_per_session: rateMap[classId] ?? 0,
          rate_set: rateMap[classId] != null,
          class: cls ? { name: cls.name ?? "" } : null,
        };
      });
      setSessions(sessionsWithRate as InvoiceSession[]);
      // Only auto-select sessions that have a rate set
      setSelected(new Set(sessionsWithRate.filter(s => s.rate_set).map(s => s.id)));
    }

    const { data: inv } = await supabase.from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, rejection_reason, coach_invoice_items(id, item_type, class_id, session_count, rate, description, proof_url, class:classes(name))")
      .eq("coach_id", coachId)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false });
    if (inv) setPastInvoices(inv as unknown as PastInvoice[]);

    const { data: extraRate } = await supabase.from("coach_extra_rates").select("rate_per_session").eq("coach_id", coachId).maybeSingle();
    setExtraRatePerSession(extraRate?.rate_per_session ?? null);

    setLoading(false);
  }, [coachId, monthFilter, branchId, supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = (id: string) => { const s = new Set(selected); if (s.has(id)) { s.delete(id); } else { s.add(id); } setSelected(s); };
  const sessionsTotal = sessions.filter(s => selected.has(s.id)).reduce((a, s) => a + s.rate_per_session, 0);
  const extraTotal = extraItems.reduce((a, e) => a + e.sessionCount * e.rate, 0);
  const reimburseTotal = reimburseItems.reduce((a, r) => a + r.amount, 0);
  const total = sessionsTotal + extraTotal + reimburseTotal;

  const addExtraItem = () => {
    if (extraRatePerSession == null) return;
    const count = Number(extraSessionCount);
    if (!count || count <= 0) return toast.error(t("coach.invoice.validSessionCountRequired"));
    setExtraItems(prev => [...prev, { id: crypto.randomUUID(), sessionCount: count, rate: extraRatePerSession }]);
    setExtraSessionCount("");
  };
  const removeExtraItem = (id: string) => setExtraItems(prev => prev.filter(e => e.id !== id));

  const addReimburseItem = (item: Omit<DraftReimburseItem, "id">) => {
    setReimburseItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
    setShowReimburseModal(false);
  };
  const removeReimburseItem = (id: string) => setReimburseItems(prev => prev.filter(r => r.id !== id));

  const generate = async () => {
    if (selected.size === 0 && extraItems.length === 0 && reimburseItems.length === 0) return toast.error(t("coach.invoice.selectAtLeastOneOrAddExtra"));
    const noRate = sessions.filter(s => selected.has(s.id) && !s.rate_set);
    if (noRate.length > 0) return toast.error(t("coach.invoice.rateNotSetTitle"), t("coach.invoice.rateNotSetBody", { classes: noRate.map(s => s.class?.name ?? s.class_id).join(", ") }));
    setGenerating(true);
    const [y, m] = monthFilter.split("-");
    const fallbackLabel = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString(localeTag, { month: "long", year: "numeric" });
    const periodLabel = activePeriod?.label ?? fallbackLabel;
    const num = `INV-${monthFilter.replace("-", "")}-${coachId.slice(0, 6).toUpperCase()}`;

    const { data: inv, error: invError } = await supabase.from("coach_invoices").insert({
      coach_id: coachId,
      branch_id: branchId,
      invoice_number: num,
      period_label: periodLabel,
      period_id: activePeriod?.id ?? null,
      total_amount: total,
      bank_info: profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null,
      status: "pending",
    }).select("id").single();

    if (invError || !inv) { toast.error(t("coach.invoice.generateInvoiceFailed"), invError?.message); setGenerating(false); return; }

    // Claim attendance sessions atomically — only rows still unclaimed
    // (invoice_id IS NULL) get this invoice_id. This prevents two concurrent
    // invoice submissions (double-tap, two tabs) from both billing the same
    // session: whichever request's UPDATE lands second simply claims nothing
    // for that row.
    const selectedSessions = sessions.filter(s => selected.has(s.id));
    let claimedSessions = selectedSessions;
    if (selectedSessions.length > 0) {
      const { data: claimed } = await supabase
        .from("coach_attendances")
        .update({ invoice_id: inv.id })
        .in("id", [...selected])
        .is("invoice_id", null)
        .select("id");
      const claimedIds = new Set((claimed ?? []).map((c: { id: string }) => c.id));
      claimedSessions = selectedSessions.filter(s => claimedIds.has(s.id));
      const lostCount = selectedSessions.length - claimedSessions.length;
      if (lostCount > 0) {
        toast.error(t("coach.invoice.sessionsAlreadyClaimedTitle"), t("coach.invoice.sessionsAlreadyClaimedBody", { count: lostCount }));
      }
    }
    if (claimedSessions.length > 0) {
      await supabase.from("coach_invoice_items").insert(claimedSessions.map(s => ({
        invoice_id: inv.id, item_type: "class", attendance_id: s.id, class_id: s.class_id, rate: s.rate_per_session, session_count: 1,
      })));
    }
    // Recompute total from what was actually claimed — a lost race means
    // fewer sessions than originally previewed.
    const claimedSessionsTotal = claimedSessions.reduce((a, s) => a + s.rate_per_session, 0);
    const finalTotal = claimedSessionsTotal + extraTotal + reimburseTotal;
    if (finalTotal !== total) {
      await supabase.from("coach_invoices").update({ total_amount: finalTotal }).eq("id", inv.id);
    }

    if (extraItems.length > 0) {
      await supabase.from("coach_invoice_items").insert(extraItems.map(e => ({
        invoice_id: inv.id, item_type: "extra", class_id: null, session_count: e.sessionCount, rate: e.rate,
      })));
    }
    if (reimburseItems.length > 0) {
      await supabase.from("coach_invoice_items").insert(reimburseItems.map(r => ({
        invoice_id: inv.id, item_type: "reimburse", class_id: null, session_count: 1, rate: r.amount,
        description: r.description, proof_url: r.proofUrl,
      })));
    }

    // Notify owner — fetch all owner profiles for this branch
    const { data: ownerProfiles } = await supabase.from("profiles")
      .select("id").eq("branch_id", branchId).eq("role", "owner");
    if (ownerProfiles && ownerProfiles.length > 0) {
      await supabase.from("notifications").insert(ownerProfiles.map((op: { id: string }) => ({
        user_id: op.id,
        title: t("coach.invoice.ownerNewInvoiceTitle"),
        body: t("coach.invoice.ownerNewInvoiceBody", { name: profile?.full_name ?? t("coach.home.defaultCoachName"), num, period: periodLabel, amount: fmtIDR(finalTotal) }),
        icon: "invoice",
        kind: "info",
      })));
    }

    setGenerating(false);
    setExtraItems([]);
    setReimburseItems([]);
    toast.success(t("coach.invoice.invoiceCreatedTitle"), t("coach.invoice.invoiceCreatedBody"));
    load();
  };

  const cancelInvoice = async (invoiceId: string) => {
    const ok = await confirm({ title: t("coach.invoice.cancelInvoiceConfirmTitle"), body: t("coach.invoice.cancelInvoiceConfirmBody"), confirmLabel: t("coach.invoice.cancelInvoiceConfirmLabel"), danger: true });
    if (!ok) return;
    setCancelling(invoiceId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("cancel_coach_invoice", { p_invoice_id: invoiceId, p_coach_id: coachId });
    setCancelling(null);
    if (error) return toast.error(t("coach.invoice.cancelInvoiceFailed"), error.message);
    toast.success(t("coach.invoice.invoiceCancelledTitle"), t("coach.invoice.invoiceCancelledBody"));
    load();
  };

  return (
    <div className="space-y-5">
      {/* Active Period / Closed Header */}
      {!checkingPeriod && !activePeriod ? (
        <div className="bg-paper-tint border border-line rounded-2xl p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-paper-deep text-ink-mute flex items-center justify-center mx-auto">
            <Icon name="invoice" className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="font-display font-bold text-lg text-ink">{t("coach.invoice.noActivePeriodTitle")}</h3>
          <p className="text-ink-mute text-sm max-w-md mx-auto">{t("coach.invoice.noActivePeriodBody")}</p>
        </div>
      ) : activePeriod ? (
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="caustics absolute inset-0 opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-2 text-wave-200 text-[11px] uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-ok-400 animate-pulse" />
              {t("coach.invoice.activePeriodLabel")}
            </div>
            <h2 className="font-display font-bold text-2xl mt-0.5">{activePeriod.label}</h2>
            <div className="flex items-center gap-1.5 text-white/80 text-sm mt-2">
              <Icon name="clock" className="w-3.5 h-3.5 shrink-0" />
              {t("coach.invoice.deadlineNotice", { date: fmtDateLong(activePeriod.date_to) })}
            </div>
            <p className="text-white/60 text-xs mt-1">{t("coach.invoice.selectSessionsHint")}</p>
          </div>
        </div>
      ) : (
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="caustics absolute inset-0 opacity-30" />
          <div className="relative">
            <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">{t("coach.invoice.generateInvoiceHeader")}</div>
            <h2 className="font-display font-bold text-2xl mt-0.5">{new Date(monthFilter + "-01").toLocaleDateString(localeTag, { month: "long", year: "numeric" })}</h2>
            <p className="text-white/80 text-sm mt-1">{t("coach.invoice.selectSessionsHint")}</p>
          </div>
        </div>
      )}

      {activePeriod && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-line rounded-2xl px-4 py-2.5">
            <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="!w-36 sm:!w-44 font-mono" />
            <div className="flex items-center gap-2">
              <Btn variant="outline" size="sm" icon="plus" onClick={() => setShowReimburseModal(true)}>{t("coach.invoice.expensesBtn")}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setSelected(new Set(sessions.map(s => s.id)))}>{t("coach.invoice.selectAllBtn")}</Btn>
            </div>
          </div>
      {loading ? <div className="text-center text-ink-mute p-6">{t("coach.invoice.loadingSessions")}</div> : (
        <>
          <Card padded={false}>
            <div className="px-5 py-4 border-b border-line">
              <SectionTitle sub={t("coach.invoice.sessionsCountLabel", { count: sessions.length })}>{t("coach.invoice.classSessionsTitle")}</SectionTitle>
            </div>
            {sessions.length === 0 ? <div className="p-6 text-center text-ink-mute">{t("coach.invoice.noUninvoicedSessions")}</div> : (
              <div className="divide-y divide-line">
                {sessions.map((s) => (
                  <label key={s.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-paper-tint cursor-pointer ${selected.has(s.id) ? "bg-ocean-50/40" : ""} ${!s.rate_set ? "opacity-60" : ""}`}>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 rounded border-line-strong text-ocean-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm">{s.class?.name}</div>
                      <div className="text-xs text-ink-mute">{fmtDate(s.session_date)}</div>
                    </div>
                    {s.rate_set
                      ? <div className="font-mono font-bold text-sm shrink-0">{fmtIDR(s.rate_per_session)}</div>
                      : <div className="text-xs font-semibold text-warn-600 flex items-center gap-1 shrink-0"><Icon name="warning" className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t("coach.invoice.rateNotSetLong")}</span><span className="sm:hidden">{t("coach.invoice.rateNotSetShort")}</span></div>
                    }
                  </label>
                ))}
              </div>
            )}
          </Card>

          {/* Sesi Extra */}
          <Card className="space-y-3">
            <div>
              <div className="font-display font-bold text-ink">{t("coach.invoice.extraSessionsTitle")}</div>
              <p className="text-xs text-ink-mute mt-0.5">{t("coach.invoice.extraSessionsHint")}</p>
            </div>
            {extraRatePerSession == null ? (
              <div className="text-xs text-warn-700 bg-warn-50 border border-warn-100 rounded-xl p-3">{t("coach.invoice.extraRateNotSet")}</div>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <div className="w-28 shrink-0">
                    <Field label={t("coach.invoice.fieldExtraSessionCount")} hint={t("coach.invoice.extraRateHint", { rate: fmtIDR(extraRatePerSession) })}>
                      <Input type="number" inputMode="numeric" min={1} value={extraSessionCount} onChange={e => setExtraSessionCount(e.target.value)} placeholder="1" />
                    </Field>
                  </div>
                  <Btn variant="soft" onClick={addExtraItem} disabled={!extraSessionCount}>{t("coach.invoice.addBtn")}</Btn>
                </div>
                {extraItems.length > 0 && (
                  <div className="divide-y divide-line border-t border-line pt-2">
                    {extraItems.map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-ink-soft">{t("coach.invoice.extraSessionLine", { count: e.sessionCount, rate: fmtIDR(e.rate) })}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{fmtIDR(e.sessionCount * e.rate)}</span>
                          <button onClick={() => removeExtraItem(e.id)} className="text-ink-faint hover:text-danger-600"><Icon name="x" className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Expenses / Reimburse draft */}
          {reimburseItems.length > 0 && (
            <Card className="space-y-2">
              <div className="font-display font-bold text-ink">{t("coach.invoice.expensesReimburseTitle")}</div>
              <div className="divide-y divide-line">
                {reimburseItems.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-ink-soft truncate">{r.description}</div>
                      <a href={r.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-ocean-600 hover:underline inline-flex items-center gap-1"><Icon name="link" className="w-3 h-3" />{t("coach.invoice.viewProofLink")}</a>
                    </div>
                    <span className="font-mono font-bold shrink-0">{fmtIDR(r.amount)}</span>
                    <button onClick={() => removeReimburseItem(r.id)} className="text-ink-faint hover:text-danger-600 shrink-0"><Icon name="x" className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="bg-paper-tint">
            <div className="flex items-baseline justify-between">
              <div className="text-[11px] uppercase tracking-widest font-bold text-ink-faint">{t("coach.invoice.totalLabel", { count: selected.size, extra: extraItems.length > 0 ? t("coach.invoice.totalWithExtra", { count: extraItems.length }) : "", reimburse: reimburseItems.length > 0 ? t("coach.invoice.totalWithReimburse", { count: reimburseItems.length }) : "" })}</div>
              <div className="font-display font-extrabold text-2xl text-ocean-700">{fmtIDR(total)}</div>
            </div>
            <Btn variant="primary" size="lg" className="w-full mt-4" icon="invoice" onClick={generate} disabled={generating || (selected.size === 0 && extraItems.length === 0 && reimburseItems.length === 0)}>
              {generating ? t("coach.invoice.generatingBtn") : t("coach.invoice.generateInvoiceBtn")}
            </Btn>
          </Card>
        </>
      )}
      </>
      )}
      {pastInvoices.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub={t("coach.invoice.historySub")}>{t("coach.invoice.historyTitle")}</SectionTitle></div>
          <div className="divide-y divide-line">
            {pastInvoices.map((iv) => (
              <div key={iv.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint">
                <span className="w-10 h-10 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center"><Icon name="invoice" className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm font-mono">{iv.invoice_number}</div>
                  <div className="text-xs text-ink-mute">{iv.period_label}</div>
                  {iv.status === "rejected" && iv.rejection_reason && (
                    <div className="text-xs text-danger-500 mt-0.5 flex items-center gap-1">
                      <Icon name="warning" className="w-3 h-3" />
                      {iv.rejection_reason}
                    </div>
                  )}
                </div>
                <div className="font-mono font-bold text-sm">{fmtIDR(iv.total_amount)}</div>
                <Status kind={iv.status === "paid" ? "paid" : iv.status === "approved" ? "approved" : iv.status === "rejected" ? "rejected" : "pending"}>
                  {iv.status === "paid" ? t("coach.invoice.statusPaid") : iv.status === "approved" ? t("coach.invoice.statusApproved") : iv.status === "rejected" ? t("coach.invoice.statusRejected") : t("coach.invoice.statusPending")}
                </Status>
                <button title={t("coach.invoice.printTitleAttr")} onClick={() => {
                  const w = window.open("", "_blank", "width=700,height=900");
                  if (!w) return;
                  // Group items by class (or unique per extra/reimburse row), sum session counts
                  const itemMap: Record<string, { name: string; sessions: number; rate: number }> = {};
                  (iv.coach_invoice_items ?? []).forEach(item => {
                    const key = item.item_type === "class" ? (item.class_id ?? item.id) : item.id;
                    const label = item.item_type === "extra" ? t("coach.invoice.extraSessionsTitle")
                      : item.item_type === "reimburse" ? t("coach.invoice.printReimburseLabel", { desc: item.description ?? "" })
                      : (item.class?.name ?? item.class_id ?? "—");
                    if (!itemMap[key]) itemMap[key] = { name: label, sessions: 0, rate: item.rate };
                    itemMap[key].sessions += item.session_count;
                  });
                  const itemRows = Object.values(itemMap).map(item =>
                    `<div class="row"><span>${item.name}</span><span>${item.sessions} ${t("coach.invoice.printSessionsUnit")} × Rp ${item.rate.toLocaleString(localeTag)} = <b>Rp ${(item.sessions * item.rate).toLocaleString(localeTag)}</b></span></div>`
                  ).join("");
                  w.document.write(`<!DOCTYPE html><html><head><title>${iv.invoice_number}</title>
                    <style>body{font-family:sans-serif;padding:32px;color:#0f172a;max-width:640px;margin:auto}
                    h1{font-size:22px;font-weight:700;margin-bottom:2px}
                    .sub{font-size:13px;color:#64748b;margin-bottom:20px}
                    .section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:20px 0 6px}
                    .meta{background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.8;margin-bottom:16px}
                    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
                    .total{display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:4px}
                    .badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${iv.status === "paid" ? "#dcfce7" : "#fef9c3"};color:${iv.status === "paid" ? "#166534" : "#854d0e"}}
                    footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
                    </style></head><body>
                    <h1>${t("coach.invoice.printDocTitle")}</h1>
                    <div class="sub">${iv.invoice_number} &nbsp;·&nbsp; <span class="badge">${iv.status === "paid" ? t("coach.invoice.statusPaid") : t("coach.invoice.statusPending")}</span></div>
                    <div class="section">${t("coach.invoice.printInfoSection")}</div>
                    <div class="meta">
                      <b>${t("coach.invoice.printPeriodLabel")}</b> ${iv.period_label}<br/>
                      <b>${t("coach.invoice.printCoachLabel")}</b> ${profile?.full_name ?? "—"}<br/>
                      <b>${t("coach.invoice.printBankLabel")}</b> ${iv.bank_info ?? (profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : "—")}
                    </div>
                    <div class="section">${t("coach.invoice.printClassDetailsSection")}</div>
                    ${itemRows || `<div class="row"><span style="color:#94a3b8">${t("coach.invoice.printNoDetails")}</span></div>`}
                    <div class="total"><span>${t("coach.invoice.printTotalLabel")}</span><span>Rp ${iv.total_amount.toLocaleString(localeTag)}</span></div>
                    <footer>Next Swimming School &nbsp;·&nbsp; ${t("coach.invoice.printFooterPrinted", { date: new Date().toLocaleDateString(localeTag, { dateStyle: "long" }) })}</footer>
                    </body></html>`);
                  w.document.close();
                  w.focus();
                  w.print();
                }} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600">
                  <Icon name="print" className="w-4 h-4" />
                </button>
                {(iv.status === "pending" || iv.status === "rejected") && (
                  <button
                    title={t("coach.invoice.cancelTitleAttr")}
                    onClick={() => cancelInvoice(iv.id)}
                    disabled={cancelling === iv.id}
                    className="w-8 h-8 rounded-lg border border-danger-200 hover:bg-danger-50 flex items-center justify-center text-danger-400 hover:text-danger-600 transition-colors disabled:opacity-40"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {showReimburseModal && (
        <ReimburseModal onClose={() => setShowReimburseModal(false)} onAdd={addReimburseItem} />
      )}
    </div>
  );
}
