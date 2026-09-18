"use client";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export default function StudentBills({ studentId, studentName, branchId }: { studentId: string; studentName: string; branchId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState("active");
  const [activeBills, setActiveBills] = useState<{ id: string; period_label: string; amount: number; discount: number; discount_reason: string | null; total: number; class_name: string; type: string; sessions_total: number | null; sessions_used: number }[]>([]);
  const [history, setHistory] = useState<{ id: string; period_label: string; amount: number; paid_at: string; payment_method: string | null }[]>([]);
  const [adminWa, setAdminWa] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{ bank_name: string | null; bank_account: string | null; bank_holder: string | null } | null>(null);
  // Single source of truth for "sessions left" — same students.remaining_sessions/
  // total_sessions the home dashboard reads, kept in sync by
  // record_private_session_attendance on clock-in. Avoids showing a different
  // number here from per-bill sessions_used.
  const [sessionsInfo, setSessionsInfo] = useState<{ remaining: number | null; total: number | null } | null>(null);


  useEffect(() => {
    if (!branchId) return;
    supabase.from("branches").select("wa_numbers, bank_name, bank_account, bank_holder").eq("id", branchId).single()
      .then(({ data }) => {
        if (data) {
          const d = data as unknown as { wa_numbers: string[]; bank_name: string | null; bank_account: string | null; bank_holder: string | null };
          if (d.wa_numbers?.length) setAdminWa(d.wa_numbers[0]);
          if (d.bank_name) setBankInfo({ bank_name: d.bank_name, bank_account: d.bank_account, bank_holder: d.bank_holder });
        }
      });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps


  const load = useCallback(async () => {
    if (!studentId) return;
    const [actRes, hisRes, studentRes] = await Promise.all([
      supabase.from("bills").select("id, period_label, amount, discount, discount_reason, total, type, sessions_total, sessions_used, classes(name)").eq("student_id", studentId).in("status", ["unpaid", "partial"]).order("created_at", { ascending: false }),
      supabase.from("bills").select("id, period_label, amount, total, paid_at, paid_method").eq("student_id", studentId).eq("status", "paid").order("paid_at", { ascending: false }),
      supabase.from("students").select("remaining_sessions, total_sessions").eq("id", studentId).single(),
    ]);
    if (studentRes.data) {
      setSessionsInfo({ remaining: studentRes.data.remaining_sessions, total: studentRes.data.total_sessions });
    }
    if (actRes.data) {
      setActiveBills(actRes.data.map((b) => {
        const bx = b as unknown as { amount: number; discount: number; discount_reason: string | null; total: number; classes: { name: string } | null };
        return {
          id: b.id, period_label: b.period_label,
          amount: bx.amount ?? 0, discount: bx.discount ?? 0, discount_reason: bx.discount_reason ?? null,
          total: bx.total ?? bx.amount ?? 0,
          class_name: bx.classes?.name ?? "—",
          type: (b as unknown as { type: string }).type ?? "monthly",
          sessions_total: (b as unknown as { sessions_total: number | null }).sessions_total ?? null,
          sessions_used: (b as unknown as { sessions_used: number }).sessions_used ?? 0,
        };
      }));
    }
    if (hisRes.data) {
      setHistory(hisRes.data.map((b) => ({
        id: b.id, period_label: b.period_label, amount: (b as unknown as { total: number }).total ?? b.amount,
        paid_at: b.paid_at ?? "", payment_method: (b as unknown as { paid_method: string | null }).paid_method,
      })));
    }
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader + realtime */
  useEffect(() => {
    load();
    const channel = supabase.channel(`bills:${studentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bills", filter: `student_id=eq.${studentId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1 w-fit">
        {[["active", "Active Bills"], ["history", "History"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
        ))}
      </div>

      {tab === "active" && (
        <>
          {activeBills.length === 0 && (
            <div className="text-center py-12 text-ink-mute text-sm">{"No active bills."}</div>
          )}
          {activeBills.map((b) => (
            <Card key={b.id} className="bg-warn-50 border-warn-500/20">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white text-warn-600 flex items-center justify-center"><Icon name="wallet" className="w-6 h-6" /></span>
                <div className="flex-1">
                  <Status kind="unpaid" className="!text-[10px]">{"UNPAID"}</Status>
                  <div className="font-display font-bold text-lg text-ink mt-1">{(<>{"Bill "}<NoTranslate>{b.period_label}</NoTranslate></>)}</div>
                  <div className="text-xs text-ink-mute"><NoTranslate>{b.class_name}</NoTranslate></div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-warn-500/20 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-mute"><span>{"Class fee"}</span><span className="font-mono">{fmtIDR(b.amount)}</span></div>
                {b.discount > 0 && (
                  <div className="flex justify-between text-ok-600">
                    <span>{"Discount"}{b.discount_reason ? <> (<NoTranslate>{b.discount_reason}</NoTranslate>)</> : ""}</span>
                    <span className="font-mono">−{fmtIDR(b.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-bold text-xl text-ink pt-2 border-t border-warn-500/20"><span>{"Total"}</span><span className="font-mono text-ocean-700">{fmtIDR(b.total)}</span></div>
              </div>
              {b.type === "session_pack" && sessionsInfo?.total != null && (
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${(sessionsInfo.remaining ?? 0) <= 1 ? "bg-warn-50 border-warn-300 text-warn-800" : "bg-paper-tint border-line text-ink-soft"}`}>
                  <Icon name="calendar" className="w-4 h-4 shrink-0" />
                  <span>{`Remaining sessions: ${sessionsInfo.remaining ?? 0} of ${sessionsInfo.total} sessions`}</span>
                  {(sessionsInfo.remaining ?? 0) <= 1 && <span className="ml-auto text-warn-700 font-bold text-xs">{"Almost out!"}</span>}
                </div>
              )}
              {bankInfo?.bank_name && (
                <div className="mt-3 rounded-xl bg-ocean-50 border border-ocean-500/20 p-3 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-ocean-600">{"Payment Bank Account"}</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-soft">{"Bank"}</span>
                    <span className="font-bold text-ink"><NoTranslate>{bankInfo.bank_name}</NoTranslate></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-soft">{"Account No."}</span>
                    <span className="font-mono font-bold text-ink"><NoTranslate>{bankInfo.bank_account}</NoTranslate></span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-ink-soft">{"Account Name"}</span>
                    <span className="font-bold text-ink"><NoTranslate>{bankInfo.bank_holder}</NoTranslate></span>
                  </div>
                </div>
              )}
              {adminWa && (
                <div className="mt-3 flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-white border border-warn-500/20">
                  <Icon name="whatsapp" className="w-4 h-4 text-ok-600 shrink-0" />
                  <div className="text-xs text-ink-soft">{"Confirm payment to admin:"}</div>
                  <div className="font-mono font-bold text-sm text-ink ml-auto truncate"><NoTranslate>{adminWa}</NoTranslate></div>
                </div>
              )}
              <a href={waLink(`Hello Admin, I would like to confirm bill payment for ${b.period_label} for ${studentName}. Transfer proof attached.`, adminWa)} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full">
                <Btn variant="wa" icon="whatsapp" size="lg" className="w-full">{"Contact Admin for confirmation"}</Btn>
              </a>
              <div className="mt-2 text-[11px] text-ink-mute text-center">
                {bankInfo?.bank_name
                  ? "Transfer to the account above, then send proof via WhatsApp to admin."
                  : "Contact admin via WhatsApp for account information and payment confirmation."}
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === "history" && (
        <Card padded={false}>
          <div className="divide-y divide-line">
            {history.map((h) => {
              const d = h.paid_at ? new Date(h.paid_at) : null;
              const dateStr = d ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}` : "—";
              return (
                <div key={h.id} className="px-5 py-3.5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-600 flex items-center justify-center"><Icon name="check" className="w-4 h-4" strokeWidth={2.5} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm"><NoTranslate>{h.period_label}</NoTranslate></div>
                    <div className="text-xs text-ink-mute">{`Verified on ${dateStr}`}{h.payment_method ? <> · <NoTranslate>{h.payment_method}</NoTranslate></> : ""}</div>
                  </div>
                  <div className="font-mono font-bold text-sm">{fmtIDR(h.amount)}</div>
                </div>
              );
            })}
            {history.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">{"No payment history yet."}</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
