"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtIDR } from "@/lib/utils";
import { printPayslip } from "@/lib/printPayslip";
import { createClient } from "@/utils/supabase/client";

interface CoachPayslipItem {
  id: string; period_label: string; gross_amount: number; deductions: number;
  net_amount: number; notes: string | null; status: string;
  published_at: string | null; created_at: string;
  branch?: { name: string } | null;
}

interface PayslipDeductionRow {
  id: string;
  label: string;
  amount: number;
}

export default function CoachPayslip({ coachId, coachName }: { coachId: string; coachName: string }) {
  const supabase = createClient();
  const { t, locale } = useLocale();
  const localeTag = locale === "id" ? "id-ID" : "en-US";
  const [payslips, setPayslips] = useState<CoachPayslipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deductions, setDeductions] = useState<PayslipDeductionRow[]>([]);
  const [loadingDeductions, setLoadingDeductions] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    setLoading(true);
    supabase.from("payslips")
      .select("id, period_label, gross_amount, deductions, net_amount, notes, status, published_at, created_at, branch:branches(name)")
      .eq("coach_id", coachId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPayslips(data as unknown as CoachPayslipItem[]);
        setLoading(false);
      });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleExpand = (p: CoachPayslipItem) => {
    if (expanded === p.id) { setExpanded(null); return; }
    setExpanded(p.id);
    setLoadingDeductions(true);
    supabase.from("payslip_deductions").select("id, label, amount").eq("payslip_id", p.id).order("type").then(({ data }) => {
      if (data) setDeductions(data as PayslipDeductionRow[]);
      setLoadingDeductions(false);
    });
  };

  const printSlip = (p: CoachPayslipItem) => {
    void printPayslip(supabase, p.id);
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub={t("coach.payslip.sub")}>{t("coach.payslip.title")}</SectionTitle>

      {loading ? (
        <Card className="!p-10 text-center text-ink-mute">{t("coach.payslip.loadingData")}</Card>
      ) : payslips.length === 0 ? (
        <Card className="!p-10 text-center">
          <Icon name="invoice" className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <div className="font-display font-bold text-ink">{t("coach.payslip.noPayslipsYet")}</div>
          <p className="text-sm text-ink-mute mt-1">{t("coach.payslip.payslipsAppearHint")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payslips.map(p => (
            <div key={p.id} className="bg-white border border-line rounded-2xl overflow-hidden shadow-card">
              <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-paper-tint" onClick={() => toggleExpand(p)}>
                <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-700 flex items-center justify-center shrink-0">
                  <Icon name="wallet" className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{p.period_label}</div>
                  <div className="text-xs text-ink-mute mt-0.5">{p.branch?.name ?? "—"} · {p.published_at ? new Date(p.published_at).toLocaleDateString(localeTag, { dateStyle: "long" }) : "—"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-ok-700">{fmtIDR(p.net_amount)}</div>
                  <div className="text-xs text-ink-mute">{t("coach.payslip.netSalaryLabel")}</div>
                </div>
                <Icon name={expanded === p.id ? "chevronD" : "chevron"} className="w-4 h-4 text-ink-faint shrink-0 rotate-0" />
              </button>

              {expanded === p.id && (
                <div className="border-t border-line px-4 py-4 space-y-3 bg-paper-tint">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="col-span-2">
                      <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">{t("coach.payslip.grossSalaryLabel")}</div>
                      <div className="font-mono font-semibold">{fmtIDR(p.gross_amount)}</div>
                    </div>
                    {loadingDeductions ? (
                      <div className="col-span-2 text-xs text-ink-mute">{t("coach.payslip.loadingDeductions")}</div>
                    ) : deductions.length > 0 ? (
                      deductions.map(d => (
                        <div key={d.id} className="col-span-2 flex items-center justify-between">
                          <span className="text-xs text-ink-faint">{d.label}</span>
                          <span className="font-mono font-semibold text-danger-700 text-sm">- {fmtIDR(d.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs text-ink-faint uppercase tracking-widest font-bold">{t("coach.payslip.deductionsLabel")}</span>
                        <span className="font-mono font-semibold text-danger-700 text-sm">- {fmtIDR(p.deductions)}</span>
                      </div>
                    )}
                    <div className="col-span-2 bg-ok-50 border border-ok-200 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ok-900">{t("coach.payslip.netSalaryLabel")}</span>
                      <span className="font-mono font-bold text-ok-700 text-base">{fmtIDR(p.net_amount)}</span>
                    </div>
                  </div>
                  {p.notes && (
                    <div className="text-sm text-ink-mute bg-white rounded-xl px-3 py-2 border border-line">{p.notes}</div>
                  )}
                  <Btn variant="outline" icon="print" size="sm" className="w-full" onClick={() => printSlip(p)}>
                    {t("coach.payslip.printPayslipBtn")}
                  </Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
