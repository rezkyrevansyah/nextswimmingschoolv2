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
import RoleSwitcher from "@/components/layout/RoleSwitcher";
import { waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

interface Student {
  id: string;
  full_name: string;
  class_name: string;
  coach_name: string;
  period_id: string | null;
  period_label: string | null;
  entry_id: string | null;
  scores: Record<string, number>;
  notes: string | null;
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

  const load = useCallback(async (sId: string, pid: string) => {
    if (!sId || !pid) return;
    // Load members affiliated to this school with rapor entries for the active period
    const { data } = await supabase
      .from("members")
      .select(`
        id, full_name,
        member_classes(
          classes(
            id, name,
            profiles(full_name)
          )
        ),
        rapor_entries(
          id, scores, notes, period_id
        )
      `)
      .eq("school_id", sId);

    if (!data) return;
    const rows: Student[] = data.map((m) => {
      const mc = (m.member_classes as unknown as { classes: { id: string; name: string; profiles: { full_name: string } | null } | null }[])?.[0];
      const cls = mc?.classes;
      const entry = (m.rapor_entries as unknown as { id: string; scores: Record<string, number>; notes: string | null; period_id: string }[])
        ?.find((e) => e.period_id === pid);
      return {
        id: m.id,
        full_name: m.full_name,
        class_name: cls?.name ?? "—",
        coach_name: cls?.profiles?.full_name ? `Coach ${cls.profiles.full_name.split(" ")[0]}` : "—",
        period_id: pid,
        period_label: activePeriod?.label ?? null,
        entry_id: entry?.id ?? null,
        scores: entry?.scores ?? {},
        notes: entry?.notes ?? null,
      };
    });
    setStudents(rows);
    setLoading(false);
  }, [activePeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);

      // Load school profile by user_id
      const { data: school } = await supabase
        .from("schools")
        .select("id, name, branch_id")
        .eq("profile_id", u.id)
        .single();

      if (!school) { setLoading(false); return; }
      setSchoolId(school.id);
      setSchoolName(school.name);

      // Load admin WA for the branch
      const { data: branch } = await supabase.from("branches").select("phone").eq("id", school.branch_id).single();
      if (branch?.phone) setAdminWaPhone(branch.phone);

      // Load active rapor period for the branch
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
        await load(school.id, period.id);
      } else {
        setLoading(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-load when activePeriod becomes available
  useEffect(() => {
    if (activePeriod && schoolId) load(schoolId, activePeriod.id);
  }, [activePeriod, schoolId, load]);

  const filtered = students.filter(
    (s) => !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.class_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDone = students.filter((s) => s.entry_id !== null).length;
  const totalPending = students.filter((s) => s.entry_id === null).length;

  return (
    <div className="min-h-screen bg-paper-tint">
      <header className="bg-white border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-7 h-16 flex items-center gap-3">
          <Link href="/">
            <Logo size={32} />
          </Link>
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

      <main className="max-w-6xl mx-auto p-4 lg:p-7 anim-in space-y-6">
        {/* Hero card */}
        <Card className="bg-ocean-700 text-white border-ocean-700 relative overflow-hidden">
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
                  Berlaku {activePeriod.date_from} – {activePeriod.date_to}. Anda dapat melihat rapor seluruh siswa afiliasi sekolah Anda di Next Swimming School.
                </p>
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
        </Card>

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
                          <Btn
                            variant="soft"
                            size="sm"
                            icon="eye"
                            disabled={!s.entry_id}
                            onClick={() => setOpen(s)}
                          >
                            Lihat
                          </Btn>
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

      {/* Rapor modal */}
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`Rapor — ${open?.full_name ?? ""}`}
        size="lg"
        footer={<Btn variant="primary" onClick={() => setOpen(null)}>Tutup</Btn>}
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
              {[
                { t: "Teknik gaya bebas", key: "freestyle",    max: 10 },
                { t: "Teknik gaya dada",  key: "breaststroke", max: 10 },
                { t: "Daya tahan",        key: "endurance",    max: 100 },
              ].map((a) => {
                const val = open.scores[a.key];
                return val != null ? (
                  <div key={a.t}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink">{a.t}</span>
                      <span className="font-mono font-bold text-ocean-700">{val}/{a.max}</span>
                    </div>
                    <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                      <div
                        className={`h-full ${val / a.max > 0.7 ? "bg-ok-500" : val / a.max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`}
                        style={{ width: `${(val / a.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : null;
              })}
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

      <RoleSwitcher />
    </div>
  );
}
