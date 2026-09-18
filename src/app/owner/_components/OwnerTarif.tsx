"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtIDR } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import type { Branch } from "../_types";

interface CoachRate {
  id: string;
  class_id: string;
  coach_id: string | null;
  rate_per_session: number;
}

interface TarifClassRow {
  id: string; name: string; branch_id: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null;
  branch?: { name: string } | null;
}

interface TarifCoachRow {
  id: string;
  full_name: string;
  branchIds: string[];
  classCount: number;
  extraRate: number | null;
  hasIncompleteRate: boolean;
}

export default function OwnerTarif({ branches }: { branches: Branch[] }) {
  const toast = useToast();
  const supabase = createClient();

  const [coaches, setCoaches] = useState<TarifCoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);

  // Per-expanded-coach data
  const [expandedClasses, setExpandedClasses] = useState<TarifClassRow[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [generalRates, setGeneralRates] = useState<Record<string, string>>({});
  const [coachRates, setCoachRates] = useState<Record<string, string>>({});
  const [extraRateInput, setExtraRateInput] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    const [{ data: profileData }, { data: ccData }, { data: rateData }, { data: extraData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "coach").order("full_name"),
      supabase.from("class_coaches").select("coach_id, class_id, classes(branch_id)"),
      supabase.from("coach_rates").select("class_id, coach_id"),
      supabase.from("coach_extra_rates").select("coach_id, rate_per_session"),
    ]);

    const ccRows = (ccData ?? []) as unknown as { coach_id: string; class_id: string; classes: { branch_id: string } | null }[];
    const rateRows = (rateData ?? []) as { class_id: string; coach_id: string | null }[];
    const extraMap = new Map((extraData ?? []).map((e: { coach_id: string; rate_per_session: number }) => [e.coach_id, e.rate_per_session]));

    const classesByCoach = new Map<string, Set<string>>();
    const branchesByCoach = new Map<string, Set<string>>();
    ccRows.forEach(r => {
      if (!classesByCoach.has(r.coach_id)) classesByCoach.set(r.coach_id, new Set());
      classesByCoach.get(r.coach_id)!.add(r.class_id);
      if (r.classes?.branch_id) {
        if (!branchesByCoach.has(r.coach_id)) branchesByCoach.set(r.coach_id, new Set());
        branchesByCoach.get(r.coach_id)!.add(r.classes.branch_id);
      }
    });

    // classes that have at least a general rate
    const classesWithGeneralRate = new Set(rateRows.filter(r => !r.coach_id).map(r => r.class_id));
    // (classId, coachId) pairs with a specific override
    const specificRateKeys = new Set(rateRows.filter(r => r.coach_id).map(r => `${r.class_id}:${r.coach_id}`));

    const rows: TarifCoachRow[] = (profileData ?? []).map(p => {
      const myClassIds = Array.from(classesByCoach.get(p.id) ?? []);
      return {
        id: p.id,
        full_name: p.full_name,
        branchIds: Array.from(branchesByCoach.get(p.id) ?? []),
        classCount: myClassIds.length,
        extraRate: extraMap.get(p.id) ?? null,
        hasIncompleteRate: myClassIds.some(cid => !classesWithGeneralRate.has(cid) && !specificRateKeys.has(`${cid}:${p.id}`)),
      };
    });

    setCoaches(rows);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable-next-line react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { loadCoaches(); }, [loadCoaches]);

  const filteredCoaches = useMemo(() => {
    let r = coaches;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c => c.full_name.toLowerCase().includes(q));
    }
    if (filterBranch !== "all") r = r.filter(c => c.branchIds.includes(filterBranch));
    if (filterStatus === "complete") r = r.filter(c => !c.hasIncompleteRate && c.classCount > 0);
    if (filterStatus === "incomplete") r = r.filter(c => c.hasIncompleteRate);
    if (filterStatus === "no_extra") r = r.filter(c => c.extraRate == null);
    return r;
  }, [coaches, search, filterBranch, filterStatus]);

  const toggleExpand = async (coachId: string) => {
    if (expandedCoachId === coachId) { setExpandedCoachId(null); return; }
    setExpandedCoachId(coachId);
    setLoadingExpanded(true);

    const { data: ccData } = await supabase
      .from("class_coaches")
      .select("class:classes(id, name, branch_id, schedule_days, time_start, time_end, branch:branches(name))")
      .eq("coach_id", coachId);
    const myClasses = ((ccData ?? []) as unknown as { class: TarifClassRow | null }[])
      .map(r => r.class).filter((c): c is TarifClassRow => !!c);
    setExpandedClasses(myClasses);

    const classIds = myClasses.map(c => c.id);
    if (classIds.length > 0) {
      const { data: rateData } = await supabase
        .from("coach_rates")
        .select("class_id, coach_id, rate_per_session")
        .in("class_id", classIds);
      const gen: Record<string, string> = {};
      const cch: Record<string, string> = {};
      (rateData as CoachRate[] ?? []).forEach(r => {
        if (!r.coach_id) gen[r.class_id] = String(r.rate_per_session ?? "");
        else if (r.coach_id === coachId) cch[`${r.class_id}:${coachId}`] = String(r.rate_per_session ?? "");
      });
      setGeneralRates(gen);
      setCoachRates(cch);
    } else {
      setGeneralRates({});
      setCoachRates({});
    }

    const { data: extraRow } = await supabase.from("coach_extra_rates").select("rate_per_session").eq("coach_id", coachId).maybeSingle();
    setExtraRateInput(extraRow ? String(extraRow.rate_per_session) : "");
    setLoadingExpanded(false);
  };

  const saveGeneral = async (classId: string) => {
    const val = Number(generalRates[classId]);
    if (!val || val <= 0) return toast.error("Enter a valid rate amount");
    const key = `gen:${classId}`;
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).is("coach_id", null).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate: val, rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: null, rate: val, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Failed to save", error.message);
    toast.success("General rate saved");
    loadCoaches();
  };

  const saveCoachRate = async (classId: string, coachId: string) => {
    const key = `spec:${classId}:${coachId}`;
    const rawVal = coachRates[`${classId}:${coachId}`];
    if (!rawVal || rawVal === "") {
      setSaving(key);
      await supabase.from("coach_rates").delete().eq("class_id", classId).eq("coach_id", coachId);
      setSaving(null);
      setCoachRates(prev => { const n = { ...prev }; delete n[`${classId}:${coachId}`]; return n; });
      toast.success("Specific rate removed — will use general rate");
      loadCoaches();
      return;
    }
    const val = Number(rawVal);
    if (!val || val <= 0) return toast.error("Enter a valid rate amount");
    setSaving(key);
    const { data: existing } = await supabase.from("coach_rates").select("id").eq("class_id", classId).eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_rates").update({ rate: val, rate_per_session: val }).eq("id", existing.id)
      : supabase.from("coach_rates").insert({ class_id: classId, coach_id: coachId, rate: val, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Failed to save", error.message);
    toast.success("Specific rate saved");
    loadCoaches();
  };

  const saveExtraRate = async (coachId: string) => {
    const val = Number(extraRateInput);
    if (!val || val <= 0) return toast.error("Enter a valid extra rate amount");
    setSaving("extra");
    const { data: existing } = await supabase.from("coach_extra_rates").select("id").eq("coach_id", coachId).maybeSingle();
    const op = existing
      ? supabase.from("coach_extra_rates").update({ rate_per_session: val, updated_at: new Date().toISOString() }).eq("id", existing.id)
      : supabase.from("coach_extra_rates").insert({ coach_id: coachId, rate_per_session: val });
    const { error } = await op;
    setSaving(null);
    if (error) return toast.error("Failed to save", error.message);
    toast.success("Extra rate saved");
    loadCoaches();
  };

  return (
    <div className="space-y-4">
      {/* Notice banner matching pen.dev sh3gG */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-ocean-50 text-ocean-700 text-xs">
        <Icon name="info" className="w-4 h-4 shrink-0 text-ocean-600 mt-0.5" />
        <p className="leading-relaxed">
          A class with no general rate cannot be claimed. The coach can still clock in and the attendance row is still saved, but that session never turns into an invoice line.
        </p>
      </div>

      {/* Toolbar filter matching pen.dev fnnqp */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap flex-1">
          <div className="relative w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={"Search coach name…"}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-line bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-ocean-500 transition-colors"
            />
          </div>

          {branches.length > 1 && (
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="h-10 text-sm border border-line rounded-xl px-3 bg-paper text-ink-soft outline-none focus:border-ocean-500 transition-colors"
            >
              <option value="all">{"All Centers"}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {/* Pill status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "all", label: "All" },
            { id: "complete", label: "Complete" },
            { id: "incomplete", label: "Incomplete" },
            { id: "no_extra", label: "No extra rate" },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all ${
                filterStatus === tab.id
                  ? "bg-ocean-600 text-white shadow-xs"
                  : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card container matching pen.dev EspJM */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-xs">
        <div className="h-9 bg-paper-deep border-b border-line px-5 flex items-center text-[10px] uppercase font-bold text-ink-faint tracking-wider">
          <div className="flex-1">COACH</div>
          <div className="hidden sm:block w-36 text-right pr-4">EXTRA RATE</div>
          <div className="w-32 text-center">STATUS</div>
          <div className="w-8 text-right"></div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-mute text-sm">{"Loading data…"}</div>
        ) : filteredCoaches.length === 0 ? (
          <div className="p-12 text-center text-ink-mute text-sm">{"No coaches match the filter."}</div>
        ) : (
          <div className="divide-y divide-line">
            {filteredCoaches.map(c => {
              const incomplete = c.hasIncompleteRate;
              const isExpanded = expandedCoachId === c.id;
              return (
                <div key={c.id}>
                  <div
                    onClick={() => toggleExpand(c.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-paper-tint/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <Avatar name={c.full_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink"><NoTranslate>{c.full_name}</NoTranslate></div>
                      <div className="text-xs text-ink-mute mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {c.branchIds.length === 0 ? (
                          <span className="text-ink-faint">{"No class yet"}</span>
                        ) : (
                          c.branchIds.map(bid => (
                            <span key={bid} className="px-2 py-0.5 rounded-full bg-paper-deep text-ink-soft text-[10px] font-semibold border border-line/60">
                              <NoTranslate>{branches.find(b => b.id === bid)?.name ?? "—"}</NoTranslate>
                            </span>
                          ))
                        )}
                        <span className="text-ink-faint font-mono text-[11px]">{`· ${c.classCount} classes`}</span>
                      </div>
                    </div>
                    <div className="hidden sm:block w-36 text-right pr-4 shrink-0">
                      <div className="font-mono text-sm font-semibold text-ink">
                        {c.extraRate != null ? fmtIDR(c.extraRate) : <span className="text-ink-faint text-xs font-normal">{"Not set"}</span>}
                      </div>
                    </div>
                    <div className="w-32 flex justify-center shrink-0">
                      {c.classCount > 0 && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                          incomplete ? "bg-warn-50 text-warn-700 ring-1 ring-warn-500/20" : "bg-ok-50 text-ok-700 ring-1 ring-ok-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${incomplete ? "bg-warn-500" : "bg-ok-500"}`} />
                          {incomplete ? "Incomplete" : "Complete"}
                        </span>
                      )}
                    </div>
                    <div className="w-8 flex justify-end shrink-0">
                      <div className="w-7 h-7 rounded-lg border border-line bg-paper hover:bg-paper-deep text-ink-mute hover:text-ink flex items-center justify-center transition-colors">
                        <Icon name={isExpanded ? "chevronD" : "chevron"} className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 py-4 bg-paper-tint/60 border-t border-line space-y-4">
                      {loadingExpanded ? (
                        <div className="py-8 text-center text-ink-mute text-sm">{"Loading…"}</div>
                      ) : (
                        <>
                          {expandedClasses.length === 0 ? (
                            <p className="text-xs text-ink-faint italic py-2">{"This coach hasn't been assigned to any class yet."}</p>
                          ) : (
                            <div className="space-y-3">
                              {expandedClasses.map(cls => {
                                const genKey = `gen:${cls.id}`;
                                const specKey = `spec:${cls.id}:${c.id}`;
                                return (
                                  <div key={cls.id} className="bg-paper border border-line rounded-xl p-4 space-y-3 shadow-xs">
                                    <div>
                                      <div className="font-semibold text-sm text-ink"><NoTranslate>{cls.name}</NoTranslate></div>
                                      <div className="text-xs text-ink-mute mt-0.5">
                                        <NoTranslate>{cls.branch?.name ?? "—"}</NoTranslate>
                                        {cls.time_start && <span className="font-mono"> · {cls.time_start.slice(0,5)}{cls.time_end ? `–${cls.time_end.slice(0,5)}` : ""}</span>}
                                      </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Field label={"General Rate"} hint={"Applies to all coaches in this class"}>
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={generalRates[cls.id] ? Number(generalRates[cls.id]).toLocaleString("id-ID") : ""}
                                              onChange={e => setGeneralRates(r => ({ ...r, [cls.id]: e.target.value.replace(/\D/g, "") }))}
                                              className="font-mono text-sm"
                                              placeholder={"150.000"}
                                            />
                                          </Field>
                                        </div>
                                        <Btn variant="soft" size="sm" onClick={() => saveGeneral(cls.id)} disabled={saving === genKey}>
                                          {saving === genKey ? "…" : "Save"}
                                        </Btn>
                                      </div>
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Field label={"Specific Rate"} hint={"Override for this coach only"}>
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={coachRates[`${cls.id}:${c.id}`] ? Number(coachRates[`${cls.id}:${c.id}`]).toLocaleString("id-ID") : ""}
                                              onChange={e => setCoachRates(r => ({ ...r, [`${cls.id}:${c.id}`]: e.target.value.replace(/\D/g, "") }))}
                                              className="font-mono text-sm"
                                              placeholder={generalRates[cls.id] ? `Use general (${Number(generalRates[cls.id]).toLocaleString("id-ID")})` : "No general rate yet"}
                                            />
                                          </Field>
                                        </div>
                                        <Btn variant="soft" size="sm" onClick={() => saveCoachRate(cls.id, c.id)} disabled={saving === specKey}>
                                          {saving === specKey ? "…" : coachRates[`${cls.id}:${c.id}`] ? "Save" : "Delete"}
                                        </Btn>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="bg-paper border border-line rounded-xl p-4 space-y-3 shadow-xs">
                            <div>
                              <div className="text-sm font-bold text-ink">{"Extra Rate"}</div>
                              <p className="text-xs text-ink-mute mt-0.5">{"Additional rate per extra session outside regular classes, applies globally for this coach."}</p>
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1 max-w-56">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={extraRateInput ? Number(extraRateInput).toLocaleString("id-ID") : ""}
                                  onChange={e => setExtraRateInput(e.target.value.replace(/\D/g, ""))}
                                  className="font-mono text-sm"
                                  placeholder={"100.000"}
                                />
                              </div>
                              <Btn variant="soft" size="sm" onClick={() => saveExtraRate(c.id)} disabled={saving === "extra"}>
                                {saving === "extra" ? "…" : "Save"}
                              </Btn>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
