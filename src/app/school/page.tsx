"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import { Card, SectionTitle } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Bell from "@/components/layout/Bell";
import { waLink } from "@/lib/utils";
import { printSingleRapor, printSchoolRekap, type PrintCriterion } from "@/lib/printRapor";
import { createClient } from "@/utils/supabase/client";

interface Criterion extends PrintCriterion {}

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  coach_name: string;
  period_id: string | null;
  period_label: string | null;
  entry_id: string | null;
  scores: Record<string, number | string>;
  notes: string | null;
  criteria: Criterion[];
}

export default function SchoolPage() {
  const supabase = createClient();
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("School Panel");
  const [userId, setUserId] = useState("");
  const [adminWaPhone, setAdminWaPhone] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [activePeriod, setActivePeriod] = useState<{ id: string; label: string; date_from: string; date_to: string } | null>(null);
  const [open, setOpen] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (sId: string, pid: string, periodLabel: string) => {
    if (!sId || !pid) return;
    const { data } = await supabase
      .from("members")
      .select(`
        id,
        profile:profiles(full_name),
        member_classes(
          classes(
            id, name,
            class_coaches(profile:profiles(full_name)),
            class_criteria(id, label, kind, options, sort_order)
          )
        ),
        rapor_entries(
          id, scores, notes, period_id
        )
      `)
      .eq("school_id", sId);

    if (!data) { setLoading(false); return; }

    const rows: Student[] = data.map((m) => {
      const profile = (m.profile as unknown as { full_name: string } | null);
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; class_coaches: { profile: { full_name: string } | null }[]; class_criteria: { id: string; label: string; kind: string; options: string[] | null; sort_order: number }[] } | null }[])?.[0];
      const cls = mc?.classes;
      const firstCoach = cls?.class_coaches?.[0]?.profile;
      const entry = (m.rapor_entries as unknown as { id: string; scores: Record<string, number | string>; notes: string | null; period_id: string }[])
        ?.find((e) => e.period_id === pid);
      const criteria: Criterion[] = [...(cls?.class_criteria ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({ id: c.id, label: c.label, kind: c.kind as Criterion["kind"] }));
      return {
        id: m.id,
        full_name: profile?.full_name ?? "—",
        class_name: cls?.name ?? "—",
        coach_name: firstCoach?.full_name ?? "—",
        period_id: pid,
        period_label: periodLabel,
        entry_id: entry?.id ?? null,
        scores: entry?.scores ?? {},
        notes: entry?.notes ?? null,
        criteria,
      };
    });
    setStudents(rows);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);

      const { data: school } = await supabase
        .from("schools")
        .select("id, name, branch_id")
        .eq("profile_id", u.id)
        .single();

      if (!school) { setLoading(false); return; }
      setSchoolId(school.id);
      setSchoolName(school.name);

      const { data: branch } = await supabase.from("branches").select("wa_numbers").eq("id", school.branch_id).single();
      const waNumbers = (branch as unknown as { wa_numbers: string[] } | null)?.wa_numbers;
      if (waNumbers && waNumbers.length > 0) setAdminWaPhone(waNumbers[0]);

      const { data: period } = await supabase
        .from("rapor_periods")
        .select("id, label, date_from, date_to")
        .eq("branch_id", school.branch_id)
        .eq("is_open", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (period) {
        setActivePeriod(period);
        await load(school.id, period.id, period.label);
      } else {
        setLoading(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = students.filter(
    (s) => !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.class_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDone = students.filter((s) => s.entry_id !== null).length;
  const totalPending = students.filter((s) => s.entry_id === null).length;

  const handlePrintAll = () => {
    printSchoolRekap(
      schoolName,
      activePeriod?.label ?? "—",
      students.map(s => ({
        full_name: s.full_name,
        class_name: s.class_name,
        coach_name: s.coach_name,
        period_label: s.period_label ?? "—",
        scores: s.scores,
        notes: s.notes,
        criteria: s.criteria,
      }))
    );
  };

  const handlePrintOne = (s: Student) => {
    printSingleRapor({
      full_name: s.full_name,
      class_name: s.class_name,
      coach_name: s.coach_name,
      period_label: s.period_label ?? "—",
      scores: s.scores,
      notes: s.notes,
      criteria: s.criteria,
    });
  };

  return (
    <div className="min-h-screen bg-paper-tint">
      <header className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-7 h-16 flex items-center gap-3">
          <Link href="/"><Logo size={32} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">School Panel</h1>
            <p className="text-xs text-ink-mute truncate">{schoolName}</p>
          </div>
          <Bell userId={userId} />
          <Avatar name={schoolName} size={36} />
          <Link href="/login" className="hidden lg:inline-flex text-sm font-semibold text-ink-mute hover:text-ocean-700 px-3 py-2 rounded-lg">
            <Icon name="logout" className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-7 space-y-6">
        {/* Hero */}
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="caustics absolute inset-0 opacity-30" />
          <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-wave-500/30 blur-3xl" />
          <div className="relative grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> Periode rapor aktif
              </div>
              <h2 className="font-display font-extrabold text-3xl mt-1.5">
                {activePeriod?.label ?? "Belum ada periode aktif"}
              </h2>
              {activePeriod && (
                <p className="text-white/80 mt-2 max-w-lg">
                  Berlaku {activePeriod.date_from} – {activePeriod.date_to}. Anda dapat melihat rapor seluruh siswa afiliasi sekolah Anda.
                </p>
              )}
              {totalDone > 0 && (
                <button
                  onClick={handlePrintAll}
                  className="mt-4 inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  <Icon name="print" className="w-4 h-4" />
                  Cetak Rekap Semua Siswa
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Total siswa</div>
                <div className="font-display font-bold text-2xl mt-0.5">{students.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Rapor tersedia</div>
                <div className="font-display font-bold text-2xl mt-0.5">{totalDone}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Belum diisi</div>
                <div className="font-display font-bold text-2xl mt-0.5">{totalPending}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Students table */}
        <Card padded={false}>
          <div className="p-5 border-b border-line flex flex-wrap items-center justify-between gap-3">
            <SectionTitle sub="Klik untuk lihat rapor">Siswa Afiliasi</SectionTitle>
            <div className="flex items-center gap-2 bg-paper-tint border border-line rounded-xl px-3 py-1.5 w-72 max-w-full">
              <Icon name="search" className="w-4 h-4 text-ink-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / kelas…"
                className="bg-transparent text-sm outline-none flex-1"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-ink-mute">Memuat data…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-ink-faint font-bold border-b border-line">
                    <th className="text-left py-3 px-5 font-bold">Siswa</th>
                    <th className="text-left py-3 font-bold">Kelas</th>
                    <th className="text-left py-3 font-bold">Coach</th>
                    <th className="text-left py-3 font-bold">Status Rapor</th>
                    <th className="text-right py-3 px-5 font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-paper-tint">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.full_name} size={36} />
                          <div className="font-semibold text-ink">{s.full_name}</div>
                        </div>
                      </td>
                      <td className="text-ink-soft">{s.class_name}</td>
                      <td className="text-ink-soft">{s.coach_name}</td>
                      <td>
                        {s.entry_id
                          ? <Status kind="approved">Tersedia</Status>
                          : <Status kind="pending">Belum diisi</Status>
                        }
                      </td>
                      <td className="text-right px-5">
                        <div className="inline-flex gap-1.5">
                          <Btn variant="soft" size="sm" icon="eye" disabled={!s.entry_id} onClick={() => setOpen(s)}>Lihat</Btn>
                          <Btn variant="ghost" size="sm" icon="print" disabled={!s.entry_id} onClick={() => handlePrintOne(s)}>Cetak</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-ink-mute">Tidak ada siswa ditemukan.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Info card */}
        <Card className="bg-wave-50 border-wave-100">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-700 flex items-center justify-center shrink-0">
              <Icon name="info" className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display font-bold text-ink">Catatan untuk Sekolah</div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                School Panel hanya menampilkan data rapor siswa. Untuk pertanyaan tentang biaya, jadwal, atau penambahan siswa baru, silakan menghubungi admin cabang Next Swimming School.
              </p>
              <a
                href={adminWaPhone
                  ? `https://wa.me/62${adminWaPhone.replace(/^0/, "")}?text=${encodeURIComponent(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}`
                  : waLink(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex"
              >
                <Btn variant="wa" size="sm" icon="whatsapp">Hubungi admin cabang</Btn>
              </a>
            </div>
          </div>
        </Card>
      </main>

      {/* Rapor detail modal */}
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`Rapor — ${open?.full_name ?? ""}`}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Btn variant="ghost" icon="print" onClick={() => open && handlePrintOne(open)}>
              Cetak / PDF
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
                  <div className="text-xs text-ink-mute">{open.class_name} · {open.coach_name} · {open.period_label}</div>
                </div>
              </div>
            </Card>
            <div className="space-y-3">
              {/* Render scores using criteria labels */}
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
                            <div
                              className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`}
                              style={{ width: `${(numVal / max) * 100}%` }}
                            />
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
