"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { downloadRaporPdf, type PrintCriterion, type PrintBestTime } from "@/lib/printRapor";
import { downloadRaporZip } from "@/lib/downloadRaporZip";
import { resolveRaporSigner } from "@/lib/rapor";

interface RaporPeriod {
  id: string; label: string; date_from: string; date_to: string;
  is_open: boolean; branch_id: string;
}

interface Student {
  id: string;
  full_name: string;
  member_no: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  class_name: string;
  coach_name: string;
  coach_signature_url: string | null;
  is_filled: boolean;
  scores: Record<string, number | string>;
  notes: string | null;
  personality: string | null;
  motivation: string | null;
  learning_achievements: string | null;
  level: string | null;
  criteria: PrintCriterion[];
  best_times: PrintBestTime[];
}

const PAGE_SIZE = 15;

export default function AdminRaporList({ branchId, periods }: { branchId: string; periods: RaporPeriod[] }) {
  const supabase = createClient();
  const toast = useToast();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Student | null>(null);

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterCoach, setFilterCoach] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Default to active period once periods load (derived, not stored in state)
  const effectivePeriodId = selectedPeriodId || periods.find(p => p.is_open)?.id || periods[0]?.id || "";
  const selectedPeriod = periods.find(p => p.id === effectivePeriodId);

  const load = useCallback(async (periodId: string) => {
    if (!periodId) { setStudents([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("members")
      .select(`
        id, member_no,
        profile:profiles(full_name, avatar_url, birth_date),
        member_classes(
          classes(
            id, name, rapor_signer_coach_id,
            class_coaches(coach_id, role, profile:profiles(full_name, signature_url))
          )
        ),
        rapor_entries(
          id, scores, notes, personality, motivation, learning_achievements, level, level_id, period_id, locked,
          rapor_levels(id, name, rapor_level_criteria(id, label, kind, options, sort_order))
        )
      `)
      .eq("branch_id", branchId);

    if (!data) { setStudents([]); setLoading(false); return; }

    const memberIds = data.map(m => m.id);
    const { data: btRows } = memberIds.length
      ? await supabase.from("member_best_times").select("member_id, stroke, distance, time_seconds").in("member_id", memberIds).eq("branch_id", branchId)
      : { data: [] };
    const btByMember = new Map<string, PrintBestTime[]>();
    for (const row of (btRows ?? []) as { member_id: string; stroke: string; distance: number; time_seconds: number }[]) {
      const list = btByMember.get(row.member_id) ?? [];
      list.push({ stroke: row.stroke, distance: row.distance, time_seconds: row.time_seconds });
      btByMember.set(row.member_id, list);
    }

    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string; avatar_url: string | null; birth_date: string | null } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; rapor_signer_coach_id: string | null; class_coaches: { coach_id: string; role: string; profile: { full_name: string; signature_url: string | null } | null }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const signer = resolveRaporSigner(cls?.class_coaches ?? [], cls?.rapor_signer_coach_id);
      const entry = (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; personality: string | null; motivation: string | null; learning_achievements: string | null; level: string | null; period_id: string; locked: boolean; rapor_levels: { id: string; name: string; rapor_level_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[] } | null }[])
        ?.find((e) => e.period_id === periodId);
      const criteria: PrintCriterion[] = [...(entry?.rapor_levels?.rapor_level_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as PrintCriterion["kind"] }));
      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        member_no: (m as unknown as { member_no: string | null }).member_no ?? null,
        birth_date: profile?.birth_date ?? null,
        avatar_url: profile?.avatar_url ?? null,
        class_name: cls?.name ?? "—",
        coach_name: signer?.full_name ?? "—",
        coach_signature_url: signer?.signature_url ?? null,
        is_filled: entry?.locked === true,
        scores: entry?.scores ?? {},
        notes: entry?.notes ?? null,
        personality: entry?.personality ?? null,
        motivation: entry?.motivation ?? null,
        learning_achievements: entry?.learning_achievements ?? null,
        level: entry?.level ?? null,
        criteria,
        best_times: btByMember.get(m.id) ?? [],
      };
    });
    setStudents(rows);
    setLoading(false);
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { if (effectivePeriodId) load(effectivePeriodId); }, [effectivePeriodId, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const classList = useMemo(() => [...new Set(students.map(s => s.class_name).filter(n => n !== "—"))].sort(), [students]);
  const coachList = useMemo(() => [...new Set(students.map(s => s.coach_name).filter(n => n !== "—"))].sort(), [students]);
  const activeFilterCount = [filterClass, filterCoach, filterStatus].filter(Boolean).length;
  const resetFilters = () => { setFilterClass(""); setFilterCoach(""); setFilterStatus(""); };

  const filteredSorted = useMemo(() => {
    let result = [...students];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q) ||
        s.coach_name.toLowerCase().includes(q)
      );
    }
    if (filterClass) result = result.filter(s => s.class_name === filterClass);
    if (filterCoach) result = result.filter(s => s.coach_name === filterCoach);
    if (filterStatus === "done") result = result.filter(s => s.is_filled);
    if (filterStatus === "pending") result = result.filter(s => !s.is_filled);
    return result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [students, search, filterClass, filterCoach, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filteredSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const totalDone = students.filter(s => s.is_filled).length;

  const toPrintStudent = (s: Student) => ({
    full_name: s.full_name, avatar_url: s.avatar_url ?? undefined,
    member_no: s.member_no ?? undefined, birth_date: s.birth_date ?? undefined,
    level: s.level ?? undefined,
    class_name: s.class_name, coach_name: s.coach_name,
    coach_signature_url: s.coach_signature_url,
    period_label: selectedPeriod?.label ?? "—", scores: s.scores, notes: s.notes,
    personality: s.personality, motivation: s.motivation, learning_achievements: s.learning_achievements,
    criteria: s.criteria, best_times: s.best_times,
  });

  const handleDownloadOne = async (s: Student) => {
    setDownloadingId(s.id);
    try {
      await downloadRaporPdf(toPrintStudent(s));
    } catch {
      toast.error("Gagal download PDF", "Terjadi kesalahan. Coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadZip = async (targets: Student[]) => {
    if (targets.length === 0) return;
    setBulkDownloading(true);
    try {
      const zipName = `rapor-${(selectedPeriod?.label ?? "periode").replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().slice(0, 10)}`;
      const { success, failed } = await downloadRaporZip(targets.map(toPrintStudent), zipName);
      if (failed === 0) toast.success(`${success} rapor berhasil diunduh`);
      else if (success === 0) toast.error("Gagal mengunduh rapor", "Semua rapor gagal diproses, coba lagi.");
      else toast.error(`${success} berhasil, ${failed} gagal`, "Sebagian rapor gagal diproses, coba lagi untuk yang gagal.");
      setSelectMode(false);
      setSelected(new Set());
    } catch {
      toast.error("Gagal mengunduh rapor", "Terjadi kesalahan. Coba lagi.");
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <SectionTitle sub={`${students.length} siswa · ${totalDone} rapor tersedia`}>Daftar Rapor Siswa</SectionTitle>
        {periods.length > 0 && (
          <select
            value={effectivePeriodId}
            onChange={e => { setSelectedPeriodId(e.target.value); setSelectMode(false); setSelected(new Set()); setPage(0); }}
            className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none cursor-pointer hover:border-ocean-400 transition"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.label}{p.is_open ? " (aktif)" : ""}</option>
            ))}
          </select>
        )}
      </div>

      {!effectivePeriodId ? (
        <Card><p className="text-ink-mute text-sm">Belum ada periode rapor untuk cabang ini.</p></Card>
      ) : (
        <Card padded={false}>
          <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {!selectMode ? (
                totalDone > 0 && (
                  <button
                    type="button"
                    onClick={() => { setSelectMode(true); setSelected(new Set()); }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-white text-ink-soft hover:border-ocean-400 transition"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    Pilih & Download
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink-soft">{selected.size} dipilih</span>
                  <button type="button" onClick={() => setSelected(new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)))}
                    className="text-xs font-semibold text-ocean-600 hover:underline">Pilih semua ({filteredSorted.filter(s => s.is_filled).length})</button>
                  <button type="button" onClick={() => setSelected(new Set())}
                    className="text-xs font-semibold text-ink-mute hover:underline">Batal pilih</button>
                  <Btn variant="primary" size="sm" icon="download" disabled={selected.size === 0 || bulkDownloading}
                    onClick={() => void handleDownloadZip(students.filter(s => selected.has(s.id) && s.is_filled))}>
                    {bulkDownloading ? "Mengunduh…" : `Download ZIP (${selected.size})`}
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>Selesai</Btn>
                </div>
              )}
              {totalDone > 0 && !selectMode && (
                <Btn variant="soft" size="sm" icon="download" disabled={bulkDownloading}
                  onClick={() => void handleDownloadZip(filteredSorted.filter(s => s.is_filled))}>
                  {bulkDownloading ? "Mengunduh…" : `Download Semua (${filteredSorted.filter(s => s.is_filled).length})`}
                </Btn>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-2 focus-within:border-ocean-400 focus-within:ring-2 focus-within:ring-ocean-500/10 transition">
                <Icon name="search" className="w-4 h-4 text-ink-faint shrink-0" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Cari nama, kelas, atau coach…"
                  className="flex-1 text-sm outline-none bg-transparent min-w-0"
                />
              </div>
              <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(0); }} className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none">
                <option value="">Semua Kelas</option>
                {classList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterCoach} onChange={e => { setFilterCoach(e.target.value); setPage(0); }} className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none">
                <option value="">Semua Coach</option>
                {coachList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }} className="text-xs font-semibold border border-line rounded-lg px-2.5 py-2 bg-white text-ink-soft outline-none">
                <option value="">Semua Status</option>
                <option value="done">Tersedia</option>
                <option value="pending">Belum diisi</option>
              </select>
              {activeFilterCount > 0 && (
                <button type="button" onClick={resetFilters} className="text-xs font-semibold text-danger-600 hover:underline">Reset filter</button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-ink-mute">Memuat data…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                      {selectMode && <th className="w-10 py-3 pl-4">
                        <input
                          type="checkbox"
                          className="rounded border-line accent-ocean-600"
                          checked={filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.filter(s => s.is_filled).every(s => selected.has(s.id))}
                          onChange={e => setSelected(e.target.checked ? new Set(filteredSorted.filter(s => s.is_filled).map(s => s.id)) : new Set())}
                        />
                      </th>}
                      <th className="text-left py-3 px-5 font-bold">Siswa</th>
                      <th className="text-left py-3 font-bold">Kelas</th>
                      <th className="text-left py-3 font-bold">Coach</th>
                      <th className="text-left py-3 font-bold">Status Rapor</th>
                      <th className="text-right py-3 px-5 font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginated.map(s => {
                      const isChecked = selected.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-paper-tint transition-colors ${selectMode && s.is_filled ? "cursor-pointer" : ""} ${selectMode && isChecked ? "bg-ocean-50" : ""}`}
                          onClick={() => {
                            if (!selectMode || !s.is_filled) return;
                            setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; });
                          }}
                        >
                          {selectMode && (
                            <td className="pl-4" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded border-line accent-ocean-600"
                                disabled={!s.is_filled}
                                checked={isChecked}
                                onChange={() => setSelected(prev => { const next = new Set(prev); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); return next; })}
                              />
                            </td>
                          )}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.full_name} size={36} />
                              <div className="font-semibold text-ink">{s.full_name}</div>
                            </div>
                          </td>
                          <td className="text-ink-soft text-sm">{s.class_name}</td>
                          <td className="text-ink-soft text-sm">{s.coach_name}</td>
                          <td>{s.is_filled ? <Status kind="approved">Tersedia</Status> : <Status kind="pending">Belum diisi</Status>}</td>
                          <td className="text-right px-5">
                            <div className="inline-flex gap-1.5">
                              <Btn variant="soft" size="sm" icon="eye" disabled={!s.is_filled} onClick={() => setOpen(s)}>Lihat</Btn>
                              <Btn variant="ghost" size="sm" icon="download" disabled={!s.is_filled || downloadingId === s.id} onClick={() => void handleDownloadOne(s)}>
                                {downloadingId === s.id ? "Mengunduh…" : "Download PDF"}
                              </Btn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSorted.length === 0 && (
                      <tr>
                        <td colSpan={selectMode ? 6 : 5} className="py-14 text-center">
                          <Icon name="search" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
                          <div className="text-sm font-semibold text-ink-mute">Tidak ada siswa yang cocok</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-line">
                  <span className="text-xs text-ink-mute">Halaman {safePage + 1} dari {totalPages}</span>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                      className="p-1.5 rounded-lg border border-line disabled:opacity-40 hover:border-ocean-400 transition">
                      <Icon name="chevron-left" className="w-4 h-4" />
                    </button>
                    <button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      className="p-1.5 rounded-lg border border-line disabled:opacity-40 hover:border-ocean-400 transition">
                      <Icon name="chevron-right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Rapor detail modal */}
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`Rapor — ${open?.full_name ?? ""}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Btn variant="soft" size="sm" icon="download" disabled={downloadingId === open?.id}
              onClick={() => open && void handleDownloadOne(open)}>
              {downloadingId === open?.id ? "Mengunduh…" : "Download PDF"}
            </Btn>
            <Btn variant="primary" onClick={() => setOpen(null)}>Tutup</Btn>
          </div>
        }
      >
        {open && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="flex items-center gap-3">
                <Avatar name={open.full_name} size={42} />
                <div>
                  <div className="font-semibold text-ink">{open.full_name}</div>
                  <div className="text-xs text-ink-mute">{open.class_name} · {open.coach_name} · {selectedPeriod?.label}</div>
                </div>
              </div>
            </Card>
            <div className="space-y-3">
              {open.criteria.length > 0
                ? open.criteria.map(c => {
                    const val = open.scores[c.id];
                    if (val == null) return null;
                    const numVal = typeof val === "number" ? val : null;
                    const strVal = typeof val === "string" ? val : null;
                    const max = c.kind === "score_10" ? 10 : c.kind === "score_100" ? 100 : null;
                    return (
                      <div key={c.id}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-ink">{c.label}</span>
                          {numVal != null && max && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                        </div>
                        {numVal != null && max && (
                          <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                            <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                          </div>
                        )}
                        {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                      </div>
                    );
                  })
                : Object.entries(open.scores).map(([key, val]) => {
                    const numVal = typeof val === "number" ? val : null;
                    const strVal = typeof val === "string" ? val : null;
                    const max = numVal !== null && numVal <= 10 ? 10 : 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-ink capitalize">{key.replace(/_/g, " ")}</span>
                          {numVal != null && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                        </div>
                        {numVal != null && (
                          <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                            <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                          </div>
                        )}
                        {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                      </div>
                    );
                  })
              }
              {open.notes && (
                <div>
                  <div className="font-semibold text-ink text-sm mb-1">Catatan coach</div>
                  <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed">{open.notes}</p>
                </div>
              )}
              {Object.keys(open.scores).length === 0 && !open.notes && (
                <div className="text-center py-6 text-sm text-ink-mute">Coach belum mengisi nilai untuk periode ini.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
