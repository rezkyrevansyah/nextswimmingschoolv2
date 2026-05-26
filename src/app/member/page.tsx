"use client";
import { useState, useEffect, useCallback } from "react";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import Modal from "@/components/ui/Modal";
import MobileNav from "@/components/layout/MobileNav";
import type { NavItem as MobileNavItem } from "@/components/layout/Sidebar";
import Bell from "@/components/layout/Bell";
import { fmtIDR, fmtDate, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type TabId = "home" | "schedule" | "absen" | "bills" | "leave" | "rapor" | "profile";

const NAV_ITEMS: MobileNavItem[] = [
  { id: "home",     label: "Home",   short: "Home",   icon: "home"     },
  { id: "schedule", label: "Jadwal", short: "Jadwal", icon: "calendar" },
  { id: "bills",    label: "Tagihan",short: "Bayar",  icon: "wallet"   },
  { id: "rapor",    label: "Rapor",  short: "Rapor",  icon: "book"     },
  { id: "profile",  label: "Profile",short: "Saya",   icon: "user"     },
];

const ALL_ITEMS: MobileNavItem[] = [
  ...NAV_ITEMS.slice(0, 2),
  { id: "absen",   label: "Absensi", short: "Absen", icon: "check"     },
  { id: "bills",   label: "Tagihan", short: "Bayar", icon: "wallet"    },
  { id: "leave",   label: "Izin",    short: "Izin",  icon: "clipboard" },
  { id: "rapor",   label: "Rapor",   short: "Rapor", icon: "book"      },
  { id: "profile", label: "Profile", short: "Saya",  icon: "user"      },
];

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children, active, setActive, name, branchName, userId }: {
  children: React.ReactNode;
  active: TabId;
  setActive: (id: TabId) => void;
  name: string;
  branchName: string;
  userId: string;
}) {
  const title = active === "home" ? `Hai, ${name || "…"}` : {
    schedule: "Jadwal", absen: "Absensi", bills: "Tagihan",
    leave: "Izin", rapor: "Rapor", profile: "Profile",
  }[active] ?? "";

  const sub = active === "home"
    ? `Member · ${branchName || "…"}`
    : { schedule: "Kelas yang Anda ikuti", absen: "History kehadiran",
        bills: "Pembayaran kelas", leave: "Pengajuan ketidakhadiran",
        rapor: "Hasil penilaian coach", profile: "Data pribadi & QR" }[active] ?? "";

  return (
    <div className="min-h-screen bg-paper-tint pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-line">
        <div className="px-4 lg:px-7 h-16 flex items-center gap-3">
          <Logo size={32} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">{title}</h1>
            <p className="text-xs text-ink-mute truncate">{sub}</p>
          </div>
          <div className="hidden lg:flex items-center gap-1">
            {ALL_ITEMS.map((it) => (
              <button key={it.id} onClick={() => setActive(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon} className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </div>
          <Bell userId={userId} />
          <Avatar name={name} size={36} />
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 lg:p-7 anim-in">{children}</main>
      <MobileNav items={NAV_ITEMS} active={active} onSelect={(id) => setActive(id as TabId)} />
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────────

function MemberHome({
  setActive, memberId, memberName, branchId,
}: {
  setActive: (id: TabId) => void;
  memberId: string;
  memberName: string;
  branchId: string;
}) {
  const supabase = createClient();
  const [monthAttend, setMonthAttend] = useState({ present: 0, total: 0 });
  const [activeClasses, setActiveClasses] = useState(0);
  const [pendingBill, setPendingBill] = useState<{ period: string; amount: number; class_name: string } | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<{ title: string; body: string } | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<{ date: string; day: string; time: string; class_name: string; coach: string }[]>([]);
  const [privateReminder, setPrivateReminder] = useState<{ remaining: number; total: number } | null>(null);

  useEffect(() => {
    if (!memberId) return;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Attendance this month
    supabase.from("member_attendances")
      .select("id, status")
      .eq("member_id", memberId)
      .gte("session_date", monthStart)
      .then(({ data }) => {
        if (data) {
          setMonthAttend({ present: data.filter((r) => r.status === "hadir").length, total: data.length });
        }
      });

    // Active classes
    supabase.from("member_classes")
      .select("id", { count: "exact" })
      .eq("member_id", memberId)
      .then(({ count }) => setActiveClasses(count ?? 0));

    // Pending bill
    supabase.from("bills")
      .select("period_label, total, classes(name)")
      .eq("member_id", memberId)
      .eq("status", "unpaid")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          const cls = data.classes as unknown as { name: string } | null;
          setPendingBill({ period: data.period_label, amount: (data as unknown as { total: number }).total, class_name: cls?.name ?? "" });
        }
      });

    // Private session reminder
    supabase.from("members")
      .select("type, remaining_sessions, total_sessions")
      .eq("id", memberId)
      .single()
      .then(({ data }) => {
        if (data && data.type === "private" && data.remaining_sessions != null && data.remaining_sessions <= 1) {
          setPrivateReminder({ remaining: data.remaining_sessions, total: data.total_sessions ?? 0 });
        }
      });

    // Latest announcement — target_all OR targeted to member's classes
    supabase.from("member_classes").select("class_id").eq("member_id", memberId)
      .then(async ({ data: mcData }) => {
        const classIds = (mcData ?? []).map((mc) => (mc as unknown as { class_id: string }).class_id);
        // Fetch all active announcements for the branch
        const { data: allAnns } = await supabase.from("announcements")
          .select("title, body, target_all, announcement_classes(class_id)")
          .eq("branch_id", branchId).eq("active", true)
          .order("created_at", { ascending: false }).limit(20);
        if (!allAnns) return;
        // Show first announcement that is target_all OR has a matching class
        const match = (allAnns as unknown as { title: string; body: string; target_all: boolean; announcement_classes: { class_id: string }[] }[])
          .find((a) => a.target_all || a.announcement_classes.some((ac) => classIds.includes(ac.class_id)));
        if (match) setLatestAnnouncement({ title: match.title, body: match.body });
      });

    // Upcoming sessions from member_classes → classes (days + time_start)
    supabase.from("member_classes")
      .select("classes(id, name, schedule_days, time_start, class_coaches(profiles(full_name)))")
      .eq("member_id", memberId)
      .then(({ data }) => {
        if (!data) return;
        const sessions: typeof upcomingSessions = [];
        const today = new Date();
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        data.forEach((mc) => {
          const cls = mc.classes as unknown as { id: string; name: string; schedule_days: string[]; time_start: string; class_coaches: { profiles: { full_name: string } | null }[] } | null;
          if (!cls || !cls.schedule_days) return;
          const firstCoach = cls.class_coaches?.[0]?.profiles;
          const coachName = firstCoach?.full_name ? `Coach ${firstCoach.full_name.split(" ")[0]}` : "—";
          cls.schedule_days.forEach((day) => {
            const dayIdx = dayNames.indexOf(day);
            if (dayIdx === -1) return;
            for (let offset = 0; offset <= 14; offset++) {
              const d = new Date(today);
              d.setDate(today.getDate() + offset);
              if (d.getDay() === dayIdx) {
                sessions.push({
                  date: d.toISOString().slice(0, 10),
                  day,
                  time: cls.time_start ?? "—",
                  class_name: cls.name,
                  coach: coachName,
                });
                break;
              }
            }
          });
        });
        sessions.sort((a, b) => a.date.localeCompare(b.date));
        setUpcomingSessions(sessions.slice(0, 4));
      });
  }, [memberId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <Card className="bg-ocean-700 text-white border-ocean-700 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">Selamat datang</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">Hai, {memberName || "…"} 👋</h2>
          <p className="text-white/80 text-sm mt-1">Semangat latihan hari ini!</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Hadir bln ini</div>
              <div className="font-display font-bold text-2xl mt-0.5">{monthAttend.present} <span className="text-xs text-wave-200">/{monthAttend.total}</span></div>
            </div>
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Kelas aktif</div>
              <div className="font-display font-bold text-2xl mt-0.5">{activeClasses}</div>
            </div>
          </div>
        </div>
      </Card>

      {pendingBill && (
        <Card className="bg-warn-50 border-warn-500/20">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-warn-600 flex items-center justify-center shrink-0"><Icon name="wallet" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-ink">Tagihan {pendingBill.period}</div>
              <p className="text-sm text-ink-soft mt-0.5">{fmtIDR(pendingBill.amount)} · {pendingBill.class_name}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Btn variant="outline" size="sm" onClick={() => setActive("bills")}>Lihat Tagihan</Btn>
            <a href={waLink(`Halo Admin, saya ingin konfirmasi pembayaran ${pendingBill.period} untuk ${memberName}. Berikut bukti transfer:`)} target="_blank" rel="noreferrer">
              <Btn variant="wa" size="sm" icon="whatsapp" className="w-full">Hubungi Admin</Btn>
            </a>
          </div>
        </Card>
      )}

      {privateReminder && (
        <Card className="bg-wave-50 border-wave-200">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-600 flex items-center justify-center shrink-0 animate-pulse"><Icon name="sparkle" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-ink">Paket sesi hampir habis</div>
              <p className="text-sm text-ink-soft mt-0.5">
                {privateReminder.remaining === 0
                  ? "Paket sesi Anda sudah habis. Hubungi admin untuk perpanjangan."
                  : `Sisa ${privateReminder.remaining} sesi terakhir dalam paket. Segera perpanjang agar latihan tidak terputus.`}
              </p>
            </div>
          </div>
          <a href={waLink(`Halo Admin, saya ingin memperpanjang paket sesi private untuk ${memberName}. Sisa sesi saat ini: ${privateReminder.remaining}.`)} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full">
            <Btn variant="wa" size="sm" icon="whatsapp" className="w-full">Hubungi Admin — Perpanjang Paket</Btn>
          </a>
        </Card>
      )}

      {latestAnnouncement && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0"><Icon name="bell" className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <Status kind="active" className="!text-[10px] mb-1">PENGUMUMAN</Status>
              <div className="font-display font-bold text-ink">{latestAnnouncement.title}</div>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{latestAnnouncement.body}</p>
            </div>
          </div>
        </Card>
      )}

      {upcomingSessions.length > 0 && (
        <div>
          <SectionTitle sub="Sesi mendatang">Jadwal terdekat</SectionTitle>
          <div className="space-y-2.5">
            {upcomingSessions.map((s, i) => {
              const d = new Date(s.date + "T00:00:00");
              const dayShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()];
              const dateNum = d.getDate();
              const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
              const monthShort = monthNames[d.getMonth()];
              return (
                <Card key={i} className="!p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 text-center shrink-0">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{dayShort}</div>
                      <div className="font-display font-bold text-xl text-ocean-700">{dateNum}</div>
                      <div className="text-[10px] text-ink-mute">{monthShort}</div>
                    </div>
                    <div className="flex-1 min-w-0 pl-3 border-l border-line">
                      <div className="font-semibold text-ink text-sm truncate">{s.class_name}</div>
                      <div className="text-xs text-ink-mute font-mono mt-0.5">{s.time} · {s.coach}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Jadwal ─────────────────────────────────────────────────────────────────────

function MemberSchedule({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const [classes, setClasses] = useState<{ id: string; name: string; schedule_days: string[]; time_start: string; time_end: string | null; location: string; coach_name: string }[]>([]);
  const [sessions, setSessions] = useState<{ date: string; day: string; time: string; class_id: string }[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!memberId) return;
    supabase.from("member_classes")
      .select("classes(id, name, schedule_days, time_start, time_end, location_name, class_coaches(profiles(full_name)))")
      .eq("member_id", memberId)
      .then(async ({ data }) => {
        if (!data) return;
        const cls = data.map((mc) => {
          const c = mc.classes as unknown as { id: string; name: string; schedule_days: string[]; time_start: string; time_end: string | null; location_name: string | null; class_coaches: { profiles: { full_name: string } | null }[] } | null;
          if (!c) return null;
          const firstCoach = c.class_coaches?.[0]?.profiles;
          return { id: c.id, name: c.name, schedule_days: c.schedule_days ?? [], time_start: c.time_start, time_end: c.time_end ?? null, location: c.location_name ?? "—", coach_name: firstCoach?.full_name ? `Coach ${firstCoach.full_name.split(" ")[0]}` : "—" };
        }).filter(Boolean) as typeof classes;
        setClasses(cls);

        // Fetch today's holidays for these classes
        const classIds = cls.map(c => c.id);
        if (classIds.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const { data: hols } = await supabase.from("class_holidays").select("class_id").in("class_id", classIds).eq("holiday_date", today);
          if (hols) setHolidayClassIds(new Set(hols.map((h: { class_id: string }) => h.class_id)));
        }

        // Build upcoming sessions
        const today = new Date();
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const upcoming: typeof sessions = [];
        cls.forEach((c) => {
          c.schedule_days.forEach((day) => {
            const dayIdx = dayNames.indexOf(day);
            if (dayIdx === -1) return;
            for (let w = 0; w < 4; w++) {
              const d = new Date(today);
              const diff = ((dayIdx - today.getDay()) + 7) % 7 + (w * 7);
              d.setDate(today.getDate() + diff);
              upcoming.push({ date: d.toISOString().slice(0, 10), day, time: c.time_start ? `${c.time_start.slice(0,5)}${c.time_end ? `–${c.time_end.slice(0,5)}` : ""}` : "—", class_id: c.id });
            }
          });
        });
        upcoming.sort((a, b) => a.date.localeCompare(b.date));
        setSessions(upcoming.slice(0, 8));
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      <SectionTitle sub="Kelas terdaftar">Kelas Anda</SectionTitle>
      {classes.map((c) => {
        const isHoliday = holidayClassIds.has(c.id);
        return (
        <Card key={c.id} padded={false} className={`overflow-hidden${isHoliday ? " opacity-70" : ""}`}>
          <div className="p-5 bg-ocean-700 text-white">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="font-display font-bold text-xl">{c.name}</div>
              {isHoliday && <Status kind="holiday" className="border-white/30">Libur Hari Ini</Status>}
            </div>
            <div className="text-wave-200 text-sm mt-0.5">{c.coach_name}</div>
          </div>
          <div className="divide-y divide-line">
            {c.schedule_days.map((d, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center text-xs font-bold">{d.slice(0, 2)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{d}</div>
                  <div className="text-xs text-ink-mute font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""} · {c.location}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        );
      })}

      {sessions.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub="4 minggu ke depan">Sesi yang akan datang</SectionTitle></div>
          <div className="divide-y divide-line">
            {sessions.map((s, i) => {
              const d = new Date(s.date + "T00:00:00");
              const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
              const cls = classes.find((c) => c.id === s.class_id);
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="font-mono font-semibold text-sm text-ink w-28">{dateStr}</div>
                  <div className="text-xs text-ink-mute">{s.day} · {s.time}</div>
                  <div className="ml-auto text-xs text-ink-soft truncate max-w-24">{cls?.name ?? ""}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {classes.length === 0 && (
        <div className="text-center py-12 text-ink-mute text-sm">Belum terdaftar di kelas manapun.</div>
      )}
    </div>
  );
}

// ── Absensi ────────────────────────────────────────────────────────────────────

function MemberAbsensi({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<{ id: string; session_date: string; status: string; notes: string | null; class_name: string; time: string }[]>([]);
  const [stats, setStats] = useState({ present: 0, excused: 0, sick: 0, absent: 0 });

  useEffect(() => {
    if (!memberId) return;
    supabase.from("member_attendances")
      .select("id, session_date, status, classes(name, time_start)")
      .eq("member_id", memberId)
      .order("session_date", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return;
        const mapped = data.map((r) => {
          const cls = r.classes as unknown as { name: string; time_start: string } | null;
          return { id: r.id, session_date: r.session_date, status: r.status, notes: null as string | null, class_name: cls?.name ?? "—", time: cls?.time_start ?? "—" };
        });
        setRows(mapped);
        setStats({
          present: mapped.filter((r) => r.status === "hadir").length,
          excused: mapped.filter((r) => r.status === "izin").length,
          sick: mapped.filter((r) => r.status === "sakit").length,
          absent: mapped.filter((r) => r.status === "absent").length,
        });
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {[["Hadir", stats.present, "ok"], ["Izin", stats.excused, "warn"], ["Sakit", stats.sick, "warn"], ["Absen", stats.absent, "danger"]].map(([l, v, t]) => (
          <Card key={l as string} className="!p-3 text-center">
            <div className={`font-display font-extrabold text-2xl text-${t}-500`}>{v}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-mute">{l}</div>
          </Card>
        ))}
      </div>
      <Card padded={false}>
        <div className="divide-y divide-line">
          {rows.map((r) => {
            const d = new Date(r.session_date + "T00:00:00");
            const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            return (
              <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.status === "hadir" ? "bg-ok-50 text-ok-600" : r.status === "absent" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                  <Icon name={r.status === "hadir" ? "check" : r.status === "absent" ? "x" : "info"} className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{r.class_name}</div>
                  <div className="text-xs text-ink-mute font-mono">{dateStr} · {r.time}{r.notes ? ` · ${r.notes}` : ""}</div>
                </div>
                <Status kind={r.status === "hadir" ? "present" : r.status === "absent" ? "absent" : r.status === "izin" ? "excused" : "sick"}>{r.status === "hadir" ? "Hadir" : r.status === "absent" ? "Absen" : r.status === "izin" ? "Izin" : "Sakit"}</Status>
              </div>
            );
          })}
          {rows.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">Belum ada data absensi.</div>}
        </div>
      </Card>
    </div>
  );
}

// ── Tagihan ────────────────────────────────────────────────────────────────────

function MemberBills({ memberId, memberName, branchId }: { memberId: string; memberName: string; branchId: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState("active");
  const [activeBills, setActiveBills] = useState<{ id: string; period_label: string; amount: number; discount: number; discount_reason: string | null; total: number; class_name: string; due_date: string | null }[]>([]);
  const [history, setHistory] = useState<{ id: string; period_label: string; amount: number; paid_at: string; payment_method: string | null }[]>([]);
  const [adminWa, setAdminWa] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId) return;
    supabase.from("branches").select("wa_numbers").eq("id", branchId).single()
      .then(({ data }) => {
        if (data) {
          const numbers = (data as unknown as { wa_numbers: string[] }).wa_numbers;
          if (numbers?.length) setAdminWa(numbers[0]);
        }
      });
  }, [branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!memberId) return;
    const [actRes, hisRes] = await Promise.all([
      supabase.from("bills").select("id, period_label, amount, discount, discount_reason, total, classes(name)").eq("member_id", memberId).eq("status", "unpaid").order("created_at", { ascending: false }),
      supabase.from("bills").select("id, period_label, amount, total, paid_at, paid_method").eq("member_id", memberId).eq("status", "paid").order("paid_at", { ascending: false }),
    ]);
    if (actRes.data) {
      setActiveBills(actRes.data.map((b) => {
        const bx = b as unknown as { amount: number; discount: number; discount_reason: string | null; total: number; classes: { name: string } | null };
        return {
          id: b.id, period_label: b.period_label,
          amount: bx.amount ?? 0, discount: bx.discount ?? 0, discount_reason: bx.discount_reason ?? null,
          total: bx.total ?? bx.amount ?? 0,
          due_date: null, class_name: bx.classes?.name ?? "—",
        };
      }));
    }
    if (hisRes.data) {
      setHistory(hisRes.data.map((b) => ({
        id: b.id, period_label: b.period_label, amount: (b as unknown as { total: number }).total ?? b.amount,
        paid_at: b.paid_at ?? "", payment_method: (b as unknown as { paid_method: string | null }).paid_method,
      })));
    }
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    const channel = supabase.channel(`bills:${memberId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bills", filter: `member_id=eq.${memberId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 bg-paper-tint rounded-xl p-1 w-fit">
        {[["active", "Tagihan Aktif"], ["history", "Histori"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${tab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>{l}</button>
        ))}
      </div>

      {tab === "active" && (
        <>
          {activeBills.length === 0 && (
            <div className="text-center py-12 text-ink-mute text-sm">Tidak ada tagihan aktif.</div>
          )}
          {activeBills.map((b) => (
            <Card key={b.id} className="bg-warn-50 border-warn-500/20">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white text-warn-600 flex items-center justify-center"><Icon name="wallet" className="w-6 h-6" /></span>
                <div className="flex-1">
                  <Status kind="unpaid" className="!text-[10px]">BELUM BAYAR</Status>
                  <div className="font-display font-bold text-lg text-ink mt-1">Tagihan {b.period_label}</div>
                  <div className="text-xs text-ink-mute">{b.class_name}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-warn-500/20 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-mute"><span>Biaya kelas</span><span className="font-mono">{fmtIDR(b.amount)}</span></div>
                {b.discount > 0 && (
                  <div className="flex justify-between text-ok-600">
                    <span>Diskon{b.discount_reason ? ` (${b.discount_reason})` : ""}</span>
                    <span className="font-mono">−{fmtIDR(b.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display font-bold text-xl text-ink pt-2 border-t border-warn-500/20"><span>Total</span><span className="font-mono text-ocean-700">{fmtIDR(b.total)}</span></div>
              </div>
              {b.due_date && (
                <div className="mt-2 text-xs text-warn-700 font-semibold">Jatuh tempo: {fmtDate(b.due_date)}</div>
              )}
              {adminWa && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-warn-500/20">
                  <Icon name="whatsapp" className="w-4 h-4 text-ok-600 shrink-0" />
                  <div className="text-xs text-ink-soft">Konfirmasi pembayaran ke admin:</div>
                  <div className="font-mono font-bold text-sm text-ink ml-auto">{adminWa}</div>
                </div>
              )}
              <a href={`https://wa.me/${adminWa?.replace(/\D/g, "") ?? ""}?text=${encodeURIComponent(`Halo Admin, saya ingin konfirmasi pembayaran tagihan ${b.period_label} untuk ${memberName}. Bukti transfer terlampir.`)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full">
                <Btn variant="wa" icon="whatsapp" size="lg" className="w-full">Hubungi Admin untuk konfirmasi</Btn>
              </a>
              <div className="mt-2 text-[11px] text-ink-mute text-center">Transfer ke rekening yang diberikan admin lalu kirim bukti via WA.</div>
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
                    <div className="font-semibold text-ink text-sm">{h.period_label}</div>
                    <div className="text-xs text-ink-mute">Diverifikasi {dateStr}{h.payment_method ? ` · ${h.payment_method}` : ""}</div>
                  </div>
                  <div className="font-mono font-bold text-sm">{fmtIDR(h.amount)}</div>
                </div>
              );
            })}
            {history.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">Belum ada histori pembayaran.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Izin ───────────────────────────────────────────────────────────────────────

function MemberLeave({ memberId }: { memberId: string }) {
  const supabase = createClient();
  const [openForm, setOpenForm] = useState(false);
  const [leaves, setLeaves] = useState<{ id: string; date_from: string; date_to: string; type: string; reason: string | null; status: string; reject_reason: string | null; class_ids: string[] }[]>([]);
  const [myClasses, setMyClasses] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ class_ids: [] as string[], start_date: "", end_date: "", type: "izin", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    const [lvRes, clsRes] = await Promise.all([
      supabase.from("member_leaves")
        .select("id, date_from, date_to, type, reason, status, reject_reason, member_leave_classes(class_id)")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false }),
      supabase.from("member_classes")
        .select("classes(id, name)")
        .eq("member_id", memberId),
    ]);
    if (lvRes.data) {
      setLeaves(lvRes.data.map((l) => ({
        id: l.id, date_from: l.date_from, date_to: l.date_to, type: l.type,
        reason: l.reason, status: l.status, reject_reason: l.reject_reason,
        class_ids: (l.member_leave_classes as unknown as { class_id: string }[])?.map((x) => x.class_id) ?? [],
      })));
    }
    if (clsRes.data) {
      setMyClasses(clsRes.data.map((mc) => {
        const c = mc.classes as unknown as { id: string; name: string } | null;
        return { id: c?.id ?? "", name: c?.name ?? "" };
      }).filter((c) => c.id));
    }
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.start_date || !form.type) return;
    setSubmitting(true);
    const { data: newLeave, error } = await supabase.from("member_leaves").insert({
      member_id: memberId,
      date_from: form.start_date,
      date_to: form.end_date || form.start_date,
      type: form.type as "izin" | "sakit" | "ujian" | "lainnya",
      reason: form.notes || null,
      status: "pending" as const,
    }).select("id").single();
    // Link to classes via member_leave_classes
    if (!error && newLeave && form.class_ids.length > 0) {
      await supabase.from("member_leave_classes").insert(form.class_ids.map((class_id) => ({ leave_id: newLeave.id, class_id })));
    }
    setSubmitting(false);
    if (!error) { setOpenForm(false); setForm({ class_ids: [], start_date: "", end_date: "", type: "izin", notes: "" }); load(); }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="space-y-5">
      <Btn variant="primary" size="lg" icon="plus" className="w-full" onClick={() => setOpenForm(true)}>Ajukan Izin Baru</Btn>
      <SectionTitle sub="Pengajuan Anda">Riwayat Izin</SectionTitle>
      <Card padded={false}>
        <div className="divide-y divide-line">
          {leaves.map((l) => {
            const d = new Date(l.date_from + "T00:00:00");
            const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            const endD = l.date_to && l.date_to !== l.date_from ? new Date(l.date_to + "T00:00:00") : null;
            const dateRange = endD
              ? `${dateStr}–${endD.getDate()} ${monthNames[endD.getMonth()]}`
              : dateStr;
            const typeLabel = l.type === "izin" ? "Izin" : l.type === "sakit" ? "Sakit" : l.type === "ujian" ? "Ujian" : "Lainnya";
            return (
              <div key={l.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.status === "approved" ? "bg-ok-50 text-ok-600" : l.status === "rejected" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                    <Icon name={l.status === "approved" ? "check" : l.status === "rejected" ? "x" : "info"} className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm">{typeLabel} · {dateRange}</div>
                    <div className="text-xs text-ink-mute">Diajukan {dateStr}{l.reason ? ` · ${l.reason}` : ""}</div>
                  </div>
                  <Status kind={l.status as "approved" | "rejected" | "pending"}>{l.status === "approved" ? "Disetujui" : l.status === "rejected" ? "Ditolak" : "Menunggu"}</Status>
                </div>
                {l.reject_reason && <div className="mt-2 text-xs text-danger-600 bg-danger-50 rounded-lg p-2.5"><b>Alasan tolak:</b> {l.reject_reason}</div>}
              </div>
            );
          })}
          {leaves.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-mute">Belum ada pengajuan izin.</div>}
        </div>
      </Card>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title="Ajukan Izin"
        footer={<><Btn variant="ghost" onClick={() => setOpenForm(false)}>Batal</Btn><Btn variant="primary" disabled={submitting} onClick={submit}>Submit</Btn></>}>
        <div className="space-y-4">
          <Field label="Kelas" required hint="Bisa pilih lebih dari satu">
            <div className="flex flex-wrap gap-2 mt-1">
              {myClasses.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => setForm((f) => ({ ...f, class_ids: f.class_ids.includes(c.id) ? f.class_ids.filter((x) => x !== c.id) : [...f.class_ids, c.id] }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${form.class_ids.includes(c.id) ? "bg-ocean-600 text-white border-ocean-600" : "bg-white text-ink-soft border-line hover:border-ocean-300"}`}>
                  {c.name}
                </button>
              ))}
              {myClasses.length === 0 && <span className="text-sm text-ink-mute">Tidak ada kelas terdaftar</span>}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal mulai" required><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></Field>
            <Field label="Tanggal selesai"><Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></Field>
          </div>
          <Field label="Jenis izin" required>
            <div className="grid grid-cols-4 gap-2">
              {[["izin", "Izin"], ["sakit", "Sakit"], ["ujian", "Ujian"], ["lainnya", "Lainnya"]].map(([val, label]) => (
                <label key={val} className={`px-2 py-2 rounded-xl border text-xs font-semibold text-center cursor-pointer ${form.type === val ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  <input type="radio" name="lt" className="sr-only" checked={form.type === val} onChange={() => setForm((f) => ({ ...f, type: val }))} />{label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Alasan tambahan"><Textarea rows={3} placeholder="Mis. Demam, tidak bisa hadir" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
          <div className="text-xs text-ink-mute bg-paper-tint rounded-lg p-3 flex items-start gap-2"><Icon name="info" className="w-4 h-4 mt-0.5 text-wave-600" />Pengajuan akan menunggu persetujuan admin.</div>
        </div>
      </Modal>
    </div>
  );
}

// ── Rapor ──────────────────────────────────────────────────────────────────────

interface RaporEntryFull {
  id: string; period: string; class_name: string; coach_id: string; coach_name: string;
  scores: Record<string, number>; notes: string | null;
  review_stars: number | null; review_message: string | null; review_id: string | null;
}

function MemberRapor({ memberId, memberName }: { memberId: string; memberName: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RaporEntryFull | null>(null);
  const [entries, setEntries] = useState<RaporEntryFull[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) return;
    const { data } = await supabase.from("rapor_entries")
      .select("id, scores, notes, coach_id, period_id, class_id, rapor_periods(label), classes(name), coach:profiles!rapor_entries_coach_id_fkey(full_name)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });
    if (!data) return;

    // Load existing reviews
    const entryIds = data.map((e) => e.id);
    const { data: reviews } = entryIds.length
      ? await supabase.from("member_reviews").select("id, rapor_id, stars, message").in("rapor_id", entryIds).eq("member_id", memberId)
      : { data: [] };
    const reviewMap = new Map((reviews ?? []).map((r) => [r.rapor_id, r]));

    setEntries(data.map((e) => {
      const p = e.rapor_periods as unknown as { label: string } | null;
      const cls = e.classes as unknown as { name: string } | null;
      const prof = (e as unknown as { coach: { full_name: string } | null }).coach;
      const review = reviewMap.get(e.id);
      return {
        id: e.id,
        period: p?.label ?? "—",
        class_name: cls?.name ?? "—",
        coach_id: e.coach_id,
        coach_name: prof?.full_name ? `Coach ${prof.full_name.split(" ")[0]}` : "—",
        scores: (e.scores as unknown as Record<string, number>) ?? {},
        notes: e.notes,
        review_stars: review?.stars ?? null,
        review_message: review?.message ?? null,
        review_id: review?.id ?? null,
      };
    }));
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const openRapor = (e: RaporEntryFull) => {
    setSelectedEntry(e);
    setReviewRating(e.review_stars ?? 5);
    setReviewText(e.review_message ?? "");
    setOpen(true);
  };

  const saveReview = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    if (selectedEntry.review_id) {
      await supabase.from("member_reviews").update({ stars: reviewRating, message: reviewText }).eq("id", selectedEntry.review_id);
    } else {
      await supabase.from("member_reviews").insert({ rapor_id: selectedEntry.id, member_id: memberId, coach_id: selectedEntry.coach_id, stars: reviewRating, message: reviewText });
    }
    setSaving(false);
    await load();
    setOpen(false);
  };

  const latest = entries[0];

  return (
    <div className="space-y-5">
      {latest && (
        <Card className="bg-ocean-700 text-white border-ocean-700 relative overflow-hidden">
          <div className="caustics absolute inset-0 opacity-30" />
          <div className="relative flex items-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"><Icon name="book" className="w-7 h-7" /></span>
            <div>
              <div className="text-wave-200 text-[10px] uppercase tracking-widest font-bold">Rapor terbaru</div>
              <div className="font-display font-bold text-xl mt-0.5">{latest.period}</div>
              <div className="text-white/80 text-xs mt-0.5">{latest.coach_name} · {latest.class_name}</div>
            </div>
            <Btn variant="accent" size="sm" className="ml-auto" onClick={() => openRapor(latest)}>Buka</Btn>
          </div>
        </Card>
      )}

      {entries.length > 1 && (
        <>
          <SectionTitle sub="Rapor sebelumnya">History Rapor</SectionTitle>
          <div className="space-y-2.5">
            {entries.slice(1).map((r) => (
                <Card key={r.id} className="!p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-paper-tint text-ink-soft flex items-center justify-center"><Icon name="book" className="w-4 h-4" /></span>
                    <div className="flex-1 min-w-0"><div className="font-semibold text-ink text-sm">{r.period}</div><div className="text-xs text-ink-mute">{r.coach_name} · {r.class_name}</div></div>
                    <Btn variant="ghost" size="sm" onClick={() => openRapor(r)}>Buka</Btn>
                  </div>
                </Card>
            ))}
          </div>
        </>
      )}

      {entries.length === 0 && (
        <div className="text-center py-12 text-ink-mute text-sm">Belum ada rapor yang tersedia.</div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`Rapor — ${selectedEntry?.period ?? ""}`} size="lg"
        footer={<Btn variant="primary" onClick={() => setOpen(false)}>Tutup</Btn>}>
        {selectedEntry && (
          <div className="space-y-4">
            <Card className="!p-3 bg-paper-tint">
              <div className="flex items-center gap-3"><Avatar name={memberName} size={42} /><div><div className="font-semibold text-ink">{memberName}</div><div className="text-xs text-ink-mute">{selectedEntry.class_name} · {selectedEntry.coach_name}</div></div></div>
            </Card>
            <div className="space-y-3">
              {Object.entries(selectedEntry.scores).map(([key, val]) => {
                const numVal = typeof val === "number" ? val : null;
                const strVal = typeof val === "string" ? val : null;
                // Detect max: if key looks numeric and value is ≤100 render as bar
                const isScore = numVal !== null;
                const max = numVal !== null && numVal <= 10 ? 10 : 100;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-ink capitalize">{key.replace(/_/g, " ")}</span>
                      {isScore && <span className="font-mono font-bold text-ocean-700">{numVal}/{max}</span>}
                    </div>
                    {isScore && (
                      <div className="h-2 mt-1.5 bg-paper-deep rounded-full overflow-hidden">
                        <div className={`h-full ${numVal / max > 0.7 ? "bg-ok-500" : numVal / max > 0.4 ? "bg-wave-500" : "bg-warn-500"}`} style={{ width: `${(numVal / max) * 100}%` }} />
                      </div>
                    )}
                    {strVal && <p className="text-sm text-ink-soft bg-paper-tint px-3 py-1.5 rounded-lg mt-1">{strVal}</p>}
                  </div>
                );
              })}
              {selectedEntry.notes && (
                <div>
                  <div className="font-semibold text-ink text-sm mb-1">Catatan coach</div>
                  <p className="text-sm text-ink-soft bg-paper-tint p-3 rounded-xl leading-relaxed">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
            <Card className="bg-wave-50 border-wave-100">
              <div className="font-display font-bold text-ink mb-2">Review untuk {selectedEntry.coach_name}</div>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, k) => (
                  <button key={k} onClick={() => setReviewRating(k + 1)}>
                    <Icon name="star" className={`w-7 h-7 ${k < reviewRating ? "text-amber-400" : "text-ink-faint"}`} strokeWidth={0} />
                  </button>
                ))}
              </div>
              <Textarea rows={2} placeholder="Tulis review Anda (opsional)" value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
              <Btn variant="primary" size="sm" className="mt-3" disabled={saving} onClick={saveReview}>Simpan review</Btn>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────

function MemberProfile({ memberId, memberName }: { memberId: string; memberName: string }) {
  const supabase = createClient();
  const [profile, setProfile] = useState<{
    full_name: string; birth_date: string | null; gender: string | null;
    phone: string | null; address: string | null; health_notes: string | null;
    date_start: string | null; qr_code: string | null;
  } | null>(null);
  const [regInfo, setRegInfo] = useState<{ parent_name: string | null; parent_phone: string | null } | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHealth, setEditHealth] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  useEffect(() => {
    if (!memberId) return;
    // member row for date_start + qr_code
    supabase.from("members")
      .select("date_start, qr_code, profile_id")
      .eq("id", memberId)
      .single()
      .then(({ data: m }) => {
        if (!m) return;
        // profile row for personal data
        supabase.from("profiles")
          .select("full_name, birth_date, gender, phone, address, health_notes")
          .eq("id", m.profile_id)
          .single()
          .then(({ data: p }) => {
            if (p) {
              setProfile({ ...p, date_start: m.date_start ?? null, qr_code: m.qr_code ?? null });
              setEditPhone(p.phone ?? "");
              setEditAddress(p.address ?? "");
              setEditHealth(p.health_notes ?? "");
            }
          });
        // registration for parent info
        supabase.from("registrations")
          .select("parent_name, parent_phone")
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data: r }) => { if (r) setRegInfo({ parent_name: r.parent_name, parent_phone: r.parent_phone }); });
      });
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async () => {
    if (!memberId || !profile) return;
    setSaving(true);
    // profile_id is fetched inside useEffect; we update profiles by auth uid
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ phone: editPhone, address: editAddress, health_notes: editHealth }).eq("id", user.id);
    setSaving(false);
  };

  const changePwd = async () => {
    setPwdError("");
    if (newPwd !== confirmPwd) { setPwdError("Password tidak cocok"); return; }
    if (newPwd.length < 6) { setPwdError("Password minimal 6 karakter"); return; }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdSaving(false);
    if (error) { setPwdError(error.message); return; }
    setNewPwd(""); setConfirmPwd("");
  };

  const age = profile?.birth_date ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={memberName} size={72} />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink">{profile?.full_name ?? memberName}</div>
            <div className="text-sm text-ocean-700 font-semibold">{age != null ? `${age} thn · ` : ""}Member</div>
            {profile?.date_start && <div className="text-xs text-ink-mute mt-1">Member sejak {fmtDate(profile.date_start)}</div>}
          </div>
        </div>
        {(regInfo?.parent_name || regInfo?.parent_phone) && (
          <Card className="!p-3 mt-4 bg-paper-tint border-line">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {regInfo.parent_name && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Wali</div><div className="font-semibold text-ink">{regInfo.parent_name}</div></div>}
              {regInfo.parent_phone && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">No HP wali</div><div className="font-semibold text-ink font-mono text-xs">{regInfo.parent_phone}</div></div>}
            </div>
          </Card>
        )}
      </Card>

      <Card className="text-center">
        <SectionTitle sub="Print sebagai kartu absensi — QR tidak pernah berubah">QR Code Absensi</SectionTitle>
        <div className="flex justify-center my-4">
          <QRBox
            value={profile?.qr_code ?? `NSS-M-${memberId.slice(0, 8).toUpperCase()}`}
            size={180}
            downloadable
            downloadName={`QR-${profile?.full_name?.replace(/\s+/g, "-") ?? memberId}`}
          />
        </div>
        <div className="flex justify-center gap-2">
          <a href={waLink("Halo, kirimkan kartu QR absensi anak saya untuk diprint.")} target="_blank" rel="noreferrer">
            <Btn variant="wa" size="md" icon="whatsapp">Minta cetak</Btn>
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Yang bisa diubah sendiri">Data yang bisa diupdate</SectionTitle>
        <div className="space-y-3">
          <Field label="No HP"><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></Field>
          <Field label="Alamat"><Textarea rows={2} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></Field>
          <Field label="Riwayat kesehatan / alergi"><Textarea rows={2} value={editHealth} onChange={(e) => setEditHealth(e.target.value)} /></Field>
          <Btn variant="primary" disabled={saving} onClick={saveProfile}>Simpan perubahan</Btn>
        </div>
        <div className="mt-4 pt-4 border-t border-line text-xs text-ink-mute flex items-start gap-2">
          <Icon name="info" className="w-4 h-4 mt-0.5 text-wave-600" />
          Untuk mengubah nama, tanggal lahir, atau kelas — silakan hubungi admin cabang.
        </div>
      </Card>

      <Card>
        <SectionTitle>Ganti password</SectionTitle>
        <div className="space-y-3">
          <Field label="Password baru"><Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></Field>
          <Field label="Konfirmasi password"><Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} /></Field>
          {pwdError && <p className="text-xs text-danger-600">{pwdError}</p>}
          <Btn variant="primary" disabled={pwdSaving} onClick={changePwd}>Simpan password baru</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MemberPage() {
  const supabase = createClient();
  const [active, setActive] = useState<TabId>("home");
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const meta = u.user_metadata ?? {};
      const bid = meta.branch_id as string | undefined;
      if (bid) setBranchId(bid);

      // Load member record by profile_id (= auth uid)
      supabase.from("members")
        .select("id, profile:profiles(full_name)")
        .eq("profile_id", u.id)
        .single()
        .then(({ data: m }) => {
          if (m) {
            setMemberId(m.id);
            setMemberName((m as unknown as { profile: { full_name: string } | null }).profile?.full_name ?? "");
          }
        });

      // Load branch name
      if (bid) {
        supabase.from("branches").select("name").eq("id", bid).single()
          .then(({ data: b }) => { if (b) setBranchName(b.name); });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pages: Record<TabId, React.ReactNode> = {
    home:     <MemberHome setActive={setActive} memberId={memberId} memberName={memberName} branchId={branchId} />,
    schedule: <MemberSchedule memberId={memberId} />,
    absen:    <MemberAbsensi memberId={memberId} />,
    bills:    <MemberBills memberId={memberId} memberName={memberName} branchId={branchId} />,
    leave:    <MemberLeave memberId={memberId} />,
    rapor:    <MemberRapor memberId={memberId} memberName={memberName} />,
    profile:  <MemberProfile memberId={memberId} memberName={memberName} />,
  };

  return (
    <>
      <Shell active={active} setActive={setActive} name={memberName} branchName={branchName} userId={userId}>
        {pages[active]}
      </Shell>
    </>
  );
}
