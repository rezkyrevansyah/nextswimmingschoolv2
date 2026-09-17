"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Branch, Invoice } from "../_types";

export default function OwnerDashboard({ branches, onSelectTab }: { branches: Branch[]; onSelectTab?: (tab: string) => void }) {
  const { t } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, submitted_at, branch:branches(name), coach:profiles!coach_invoices_coach_id_fkey(full_name)")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false })
      .limit(4)
      .then(({ data }) => { if (data) setInvoices(data as unknown as Invoice[]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalMembers = branches.reduce((a, b) => a + (b.member_count ?? 0), 0);
  const totalCoaches = branches.reduce((a, b) => a + (b.coach_count ?? 0), 0);
  const totalClasses = branches.reduce((a, b) => a + (b.class_count ?? 0), 0);

  if (branches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-line p-10 lg:p-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-card my-10 anim-in">
        <div className="w-16 h-16 rounded-full bg-ocean-50 text-ocean-600 flex items-center justify-center mb-4">
          <Icon name="apartment" className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-ink">No centers yet</h2>
        <p className="text-sm text-ink-mute mt-2 leading-relaxed max-w-sm">
          Create the first center, then coaches, classes and students can be added under it.
        </p>
        {onSelectTab && (
          <button
            onClick={() => onSelectTab("branches")}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Create Center</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <div className="bg-white rounded-2xl border border-line p-5 shadow-card flex flex-col gap-2 transition hover:border-line-strong">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            {t("owner.dashboard.statMembers")}
          </span>
          <span className="font-display font-extrabold text-3xl lg:text-[32px] text-ocean-600 leading-tight">
            {totalMembers}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 shadow-card flex flex-col gap-2 transition hover:border-line-strong">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            {t("owner.dashboard.statCoaches")}
          </span>
          <span className="font-display font-extrabold text-3xl lg:text-[32px] text-wave-600 leading-tight">
            {totalCoaches}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 shadow-card flex flex-col gap-2 transition hover:border-line-strong">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            {t("owner.dashboard.statClasses")}
          </span>
          <span className="font-display font-extrabold text-3xl lg:text-[32px] text-ok-600 leading-tight">
            {totalClasses}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-line p-5 shadow-card flex flex-col gap-2 transition hover:border-line-strong">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            {t("owner.dashboard.statInvoicesPending")}
          </span>
          <span className="font-display font-extrabold text-3xl lg:text-[32px] text-warn-600 leading-tight">
            {invoices.length}
          </span>
        </div>
      </div>

      {/* Two Columns: Per Center & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Card per center */}
        <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink leading-tight">Per center</h3>
              <p className="text-xs text-ink-mute mt-0.5">All centers, active rows only</p>
            </div>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab("branches")}
                className="text-xs font-semibold text-ocean-600 hover:text-ocean-700 hover:underline cursor-pointer"
              >
                View all &rarr;
              </button>
            )}
          </div>

          <div className="bg-paper-deep px-5 h-[34px] flex items-center text-[10px] uppercase font-bold text-ink-faint tracking-wider border-b border-line">
            <span className="flex-1 text-left">CENTER</span>
            <span className="w-20 text-right">STUDENTS</span>
            <span className="w-20 text-right">COACHES</span>
            <span className="w-20 text-right">CLASSES</span>
          </div>

          <div className="divide-y divide-line">
            {branches.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectTab && onSelectTab("branches")}
                className="flex items-center px-5 h-11 hover:bg-paper-tint transition text-sm cursor-pointer group"
              >
                <span className="flex-1 min-w-0 font-medium text-ink group-hover:text-ocean-700 truncate pr-2">
                  <NoTranslate>{b.name}</NoTranslate>
                </span>
                <span className="w-20 text-right font-mono text-[13px] text-ink-soft tabular-nums">
                  {b.member_count ?? 0}
                </span>
                <span className="w-20 text-right font-mono text-[13px] text-ink-soft tabular-nums">
                  {b.coach_count ?? 0}
                </span>
                <span className="w-20 text-right font-mono text-[13px] text-ink-soft tabular-nums">
                  {b.class_count ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card latest invoices */}
        <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-ink leading-tight">Latest honor invoices</h3>
              <p className="text-xs text-ink-mute mt-0.5">Four newest, pending only</p>
            </div>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab("invoices")}
                className="text-xs font-semibold text-ocean-600 hover:text-ocean-700 hover:underline cursor-pointer"
              >
                View all &rarr;
              </button>
            )}
          </div>

          <div className="divide-y divide-line">
            {invoices.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-ok-50 text-ok-600 flex items-center justify-center">
                  <Icon name="check" className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-ink">{t("owner.dashboard.allNormal")}</p>
                <p className="text-xs text-ink-mute">No coach honor invoices awaiting review at this time.</p>
              </div>
            ) : (
              invoices.map((iv) => {
                const coachName = iv.coach?.full_name ?? "Coach";
                const initials = coachName.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div
                    key={iv.id}
                    onClick={() => onSelectTab && onSelectTab("invoices")}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-paper-tint transition cursor-pointer group"
                  >
                    <div className="w-[34px] h-[34px] rounded-full bg-sub-600 text-white font-bold text-xs flex items-center justify-center shrink-0 select-none shadow-xs">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-ink group-hover:text-ocean-700 truncate leading-tight">
                        <NoTranslate>{coachName}</NoTranslate>
                      </div>
                      <div className="text-xs text-ink-mute truncate mt-0.5">
                        <NoTranslate>{iv.branch?.name ?? "Center"}</NoTranslate> · <NoTranslate>{iv.period_label}</NoTranslate>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="font-mono text-[13px] font-medium text-ink tabular-nums">
                        {fmtIDR(iv.total_amount)}
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warn-50 text-warn-600 border border-warn-500/30 text-[9px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-warn-500 animate-pulse" />
                        PENDING
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
