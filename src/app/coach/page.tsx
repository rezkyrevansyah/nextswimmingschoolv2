"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input, Select, Textarea } from "@/components/ui/FormFields";
import { Card, SectionTitle } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Placeholder from "@/components/ui/Placeholder";
import Modal from "@/components/ui/Modal";
import MobileNav from "@/components/layout/MobileNav";
import type { NavItem as MobileNavItem } from "@/components/layout/Sidebar";
import Bell from "@/components/layout/Bell";
import RoleSwitcher from "@/components/layout/RoleSwitcher";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { fmtIDR, fmtDate, fmtDateLong, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import type { User } from "@supabase/supabase-js";
import type { Html5QrcodeResult } from "html5-qrcode";

type TabId = "home" | "absen" | "kelas" | "invoice" | "rapor" | "profile";

const NAV_ITEMS: MobileNavItem[] = [
  { id: "home",    label: "Home",    short: "Home",    icon: "home"    },
  { id: "absen",   label: "Absensi", short: "Absen",   icon: "check"   },
  { id: "kelas",   label: "Kelas",   short: "Kelas",   icon: "swim"    },
  { id: "invoice", label: "Invoice", short: "Invoice", icon: "invoice" },
  { id: "rapor",   label: "Rapor",   short: "Rapor",   icon: "book"    },
  { id: "profile", label: "Profile", short: "Saya",    icon: "user"    },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClassRow {
  id: string; name: string; schedule_days: string[]; schedule_time: string;
  time_start: string; time_end: string;
  capacity: number; enrolled: number; goals: string | null;
  member_classes?: { member: { id: string; profile: { full_name: string; birth_date: string | null; phone: string | null } | null } | null }[];
}

interface AttendanceRow {
  id: string; session_date: string; clock_in_time: string | null;
  distance_meters: number | null; is_manual: boolean; manual_note: string | null; status: string;
  manual_by_profile?: { full_name: string } | null;
  class?: { name: string } | null;
}

interface MemberAttRow {
  id: string; member_id: string; session_date: string; status: string;
  member?: { full_name: string; birth_date?: string | null } | null;
}

interface InvoiceSession {
  id: string; session_date: string; class_id: string; rate_per_session: number; class?: { name: string } | null;
}

interface PastInvoice {
  id: string; invoice_number: string; period_label: string; total_amount: number; status: string;
}

interface RaporEntry {
  id: string; member_id: string; class_id: string; locked: boolean;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

interface ProfileData {
  id: string; full_name: string; email: string;
  phone: string | null; specialization: string | null;
  bank_name: string | null; bank_account: string | null; bank_holder: string | null;
  avatar_url: string | null;
  is_profile_complete: boolean;
  suspend_until: string | null;
  suspend_reason: string | null;
  certifications?: { id: string; title: string; valid_from: string | null; valid_until: string | null; status: string }[];
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children, active, setActive, title, sub, user }: {
  children: React.ReactNode;
  active: TabId; setActive: (id: TabId) => void;
  title: string; sub: string; user: User | null;
}) {
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
            {NAV_ITEMS.map((it) => (
              <button key={it.id} onClick={() => setActive(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon} className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </div>
          <Bell userId={user?.id ?? ""} />
          <Avatar name={user?.user_metadata?.full_name ?? "C"} size={36} />
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 lg:p-7 anim-in">{children}</main>
      <MobileNav items={NAV_ITEMS} active={active} onSelect={(id) => setActive(id as TabId)} />
    </div>
  );
}

// ── Clock-In flow ──────────────────────────────────────────────────────────────

function ClockInFlow({ back, coachId, branchId, classes }: {
  back: () => void;
  coachId: string; branchId: string;
  classes: ClassRow[];
}) {
  const toast = useToast();
  const { upload, uploading } = useUpload();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [gpsStatus, setGpsStatus] = useState<"checking" | "ok" | "error">("checking");
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords(pos.coords); setGpsStatus("ok"); },
      () => setGpsStatus("error"),
      { timeout: 8000 }
    );
  }, []);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setStep(2); }
  };

  const submit = async () => {
    if (!classId) return toast.error("Pilih kelas terlebih dahulu");
    setSubmitting(true);
    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().slice(0, 8);

    let selfieUrl: string | null = null;
    if (photoFile) {
      try {
        selfieUrl = await upload.selfie(photoFile, classId, today);
      } catch {
        toast.error("Upload selfie gagal", "Absensi tetap disimpan tanpa foto");
      }
    }

    const { error } = await supabase.from("coach_attendances").insert({
      branch_id: branchId, coach_id: coachId, class_id: classId,
      session_date: today, clock_in_time: nowTime,
      status: "present", is_manual: false,
      selfie_url: selfieUrl,
    });

    setSubmitting(false);
    if (error) { toast.error("Gagal menyimpan absensi", error.message); return; }
    toast.success("Absensi Berhasil", "Data tersimpan ke history & admin panel");
    setStep(3);
  };

  const selectedClass = classes.find(c => c.id === classId);

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <button onClick={back} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> Kembali
      </button>
      {step === 0 && (
        <Card className="anim-in">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-wave-50 text-wave-600 mx-auto flex items-center justify-center mb-3"><Icon name="camera" className="w-10 h-10" /></div>
            <h2 className="font-display font-bold text-xl text-ink">Clock-In</h2>
          </div>
          <Field label="Pilih kelas" required>
            <Select value={classId} onChange={e => setClassId(e.target.value)}>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.schedule_time}</option>)}
            </Select>
          </Field>
          <Card className="!p-3 mt-4 bg-paper-tint">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><div className="text-ink-faint font-bold uppercase tracking-widest">GPS</div>
                <div className={`font-semibold ${gpsStatus === "ok" ? "text-ok-600" : gpsStatus === "error" ? "text-danger-500" : "text-warn-600"}`}>
                  {gpsStatus === "ok" ? "✓ Terdeteksi" : gpsStatus === "error" ? "✗ Gagal" : "Mendeteksi…"}
                </div>
              </div>
              <div><div className="text-ink-faint font-bold uppercase tracking-widest">Kelas</div><div className="font-semibold text-ink">{selectedClass?.name ?? "—"}</div></div>
            </div>
          </Card>
          <label className="block mt-4">
            <div className="w-full px-5 py-3 bg-ocean-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-ocean-800 transition">
              <Icon name="camera" className="w-4 h-4" /> Buka kamera selfie
            </div>
            <input type="file" accept="image/*" capture="user" className="sr-only" onChange={handleCapture} />
          </label>
        </Card>
      )}
      {step === 2 && (
        <Card className="anim-in">
          {photoFile && (
            <img src={URL.createObjectURL(photoFile)} alt="selfie preview" className="w-full aspect-square object-cover rounded-2xl" />
          )}
          <Card className="!p-3 mt-3 bg-paper-tint">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="pin" className="w-4 h-4 text-ocean-600" />
              <span className="font-semibold">{coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : "Koordinat tidak tersedia"}</span>
              <Status kind={gpsStatus === "ok" ? "active" : "inactive"} className="ml-auto">{gpsStatus === "ok" ? "GPS OK" : "No GPS"}</Status>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <label>
              <Btn variant="outline" size="lg" icon="refresh" className="w-full pointer-events-none">Ambil ulang</Btn>
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={handleCapture} />
            </label>
            <Btn variant="primary" size="lg" onClick={submit} disabled={submitting || uploading}>{submitting || uploading ? "Menyimpan…" : "Submit"}</Btn>
          </div>
        </Card>
      )}
      {step === 3 && (
        <Card className="anim-in text-center">
          <div className="w-20 h-20 rounded-full bg-ok-50 text-ok-600 mx-auto flex items-center justify-center mb-3"><Icon name="check" className="w-10 h-10" strokeWidth={3} /></div>
          <h2 className="font-display font-bold text-xl text-ink">Absensi Berhasil!</h2>
          <p className="text-ink-mute text-sm mt-1">Sekarang Anda bisa scan QR member yang hadir.</p>
          <div className="mt-5">
            <Btn variant="outline" size="lg" className="w-full" onClick={back}>Kembali ke Home</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Leave form ─────────────────────────────────────────────────────────────────

function LeaveForm({ back, coachId, branchId, classes }: { back: () => void; coachId: string; branchId: string; classes: ClassRow[] }) {
  const toast = useToast();
  const supabase = createClient();
  const [type, setType] = useState("sakit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!startDate || !endDate) return toast.error("Tanggal mulai dan selesai wajib diisi");
    setSaving(true);
    const { data: leave, error } = await supabase.from("coach_leaves").insert({
      coach_id: coachId,
      type: type as "izin" | "sakit" | "lainnya", date_from: startDate, date_to: endDate, reason: reason || null, status: "pending" as const,
    }).select("id").single();

    if (error) { toast.error("Gagal mengajukan izin", error.message); setSaving(false); return; }

    if (classId && leave) {
      await supabase.from("coach_leave_classes").insert({ leave_id: leave.id, class_id: classId });
    }

    setSaving(false);
    toast.success("Pengajuan terkirim", "Menunggu persetujuan admin");
    back();
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={back} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> Kembali
      </button>
      <Card>
        <SectionTitle sub="Akan masuk ke admin untuk persetujuan">Ajukan Izin</SectionTitle>
        <div className="space-y-4">
          <Field label="Jenis izin" required>
            <div className="grid grid-cols-3 gap-2">
              {[["izin", "Izin"], ["sakit", "Sakit"], ["lainnya", "Lainnya"]].map(([val, label]) => (
                <label key={val} className={`px-3 py-2 rounded-xl border text-sm font-semibold text-center cursor-pointer ${type === val ? "border-ocean-500 bg-ocean-50 text-ocean-700" : "border-line text-ink-soft hover:bg-paper-tint"}`}>
                  <input type="radio" name="leave" className="sr-only" checked={type === val} onChange={() => setType(val)} />{label}
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mulai" required><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
            <Field label="Selesai" required><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
          </div>
          <Field label="Kelas terdampak">
            <Select value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">— pilih kelas —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {(c.schedule_days ?? []).join(", ")} {c.schedule_time}</option>)}
            </Select>
          </Field>
          <Field label="Alasan / deskripsi"><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Mis. Demam dan tidak fit" /></Field>
          <Btn variant="primary" size="lg" className="w-full" onClick={submit} disabled={saving}>{saving ? "Mengirim…" : "Submit pengajuan"}</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── QR Scanner ─────────────────────────────────────────────────────────────────

function QRScanner({ coachId, classes, onClose }: {
  coachId: string;
  classes: ClassRow[];
  onClose: () => void;
}) {
  const toast = useToast();
  const supabase = createClient();
  const divId = "qr-reader-coach";
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  // Find the class that's active right now (schedule_days includes today)
  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const activeClassId = classes.find(c => (c.schedule_days ?? []).includes(todayName))?.id ?? classes[0]?.id ?? "";

  useEffect(() => {
    let html5QrCode: import("html5-qrcode").Html5Qrcode | null = null;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrCode = new Html5Qrcode(divId);
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText: string, _result: Html5QrcodeResult) => {
            if (decodedText === lastScanned) return; // debounce same QR
            setLastScanned(decodedText);
            await markAttendance(decodedText);
          },
          undefined
        );
        setScanning(true);
      } catch {
        toast.error("Tidak bisa mengakses kamera", "Izinkan akses kamera di browser");
      }
    }

    startScanner();

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAttendance = async (qrCode: string) => {
    // Lookup member by qr_code
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("id, profile:profiles(full_name)")
      .eq("qr_code", qrCode)
      .single();

    if (mErr || !member) {
      toast.error("QR tidak dikenali", "Member tidak ditemukan");
      setTimeout(() => setLastScanned(null), 2000);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("member_attendances").upsert({
      member_id: member.id,
      class_id: activeClassId,
      session_date: today,
      status: "hadir",
      method: "qr",
      marked_by: coachId,
    }, { onConflict: "class_id,member_id,session_date" });

    const name = (member as { id: string; profile: { full_name: string } | null }).profile?.full_name ?? "Member";
    if (error) {
      toast.error(`Gagal absen ${name}`, error.message);
    } else {
      toast.success(`✓ ${name} hadir`, "Absensi tercatat");
    }

    // Allow scanning again after 2.5s
    setTimeout(() => setLastScanned(null), 2500);
  };

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <button onClick={onClose} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> Kembali
      </button>
      <Card className="text-center">
        <div className="font-display font-bold text-lg text-ink">Scan QR Member</div>
        <p className="text-xs text-ink-mute mt-1 mb-4">Arahkan kamera ke QR card member</p>
        <div id={divId} className="rounded-xl overflow-hidden bg-black" />
        {!scanning && <p className="text-xs text-ink-mute mt-3 animate-pulse">Memulai kamera…</p>}
        {lastScanned && (
          <div className="mt-3 text-xs text-ok-600 font-semibold animate-pulse">Memproses scan…</div>
        )}
      </Card>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────────

// Returns true if current time is within 1 hour before session start until session end
function isInClockInWindow(timeStart: string, timeEnd: string): boolean {
  const now = new Date();
  const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = toMinutes(timeStart);
  const endMin = toMinutes(timeEnd);
  return nowMin >= startMin - 60 && nowMin <= endMin;
}

function CoachHome({ setOverlay, coachId, branchId, profile, classes, holidayClassIds }: {
  setOverlay: (v: string) => void;
  coachId: string; branchId: string;
  profile: ProfileData | null;
  classes: ClassRow[];
  holidayClassIds: Set<string>;
}) {
  const supabase = createClient();
  const [monthStats, setMonthStats] = useState({ present: 0, leave: 0, sub: 0 });
  const [subClasses, setSubClasses] = useState<{ classId: string; className: string; originalCoach: string }[]>([]);

  useEffect(() => {
    if (!coachId) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    supabase.from("coach_attendances").select("id, status").eq("coach_id", coachId).gte("session_date", monthStart).lte("session_date", monthEnd)
      .then(({ data }) => {
        if (data) setMonthStats({ present: data.filter(a => a.status === "present").length, leave: data.filter(a => a.status === "absent").length, sub: 0 });
      });

    // Load substitute assignments for today
    supabase.from("coach_leaves")
      .select("id, date_from, date_to, coach:profiles!coach_leaves_coach_id_fkey(full_name), coach_leave_classes(class:classes(id, name))")
      .eq("substitute_id", coachId)
      .eq("status", "approved")
      .lte("date_from", today)
      .gte("date_to", today)
      .then(({ data }) => {
        if (!data) return;
        const subs: { classId: string; className: string; originalCoach: string }[] = [];
        (data as unknown as { coach: { full_name: string } | null; coach_leave_classes: { class: { id: string; name: string } | null }[] }[]).forEach(l => {
          l.coach_leave_classes.forEach(lc => {
            if (lc.class) subs.push({ classId: lc.class.id, className: lc.class.name, originalCoach: l.coach?.full_name ?? "—" });
          });
        });
        setSubClasses(subs);
        setMonthStats(s => ({ ...s, sub: subs.length }));
      });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const todayClasses = classes.filter(c => (c.schedule_days ?? []).includes(todayName));

  return (
    <div className="space-y-5">
      <Card className="bg-ocean-700 text-white border-ocean-700 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">Selamat siang</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">Halo, {profile?.full_name ?? "Coach"}</h2>
          <p className="text-white/80 text-sm mt-1.5">Anda punya {todayClasses.length + subClasses.length} kelas hari ini.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[["Hadir bln ini", monthStats.present.toString()], ["Izin", monthStats.leave.toString()], ["Pengganti", monthStats.sub.toString()]].map(([l, v]) => (
              <div key={l} className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{l}</div>
                <div className="font-display font-bold text-2xl mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle sub={fmtDateLong(new Date())}>Kelas hari ini</SectionTitle>
        {todayClasses.length === 0 && subClasses.length === 0 ? (
          <Card><p className="text-ink-mute text-sm">Tidak ada kelas hari ini.</p></Card>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((c) => {
              const isHoliday = holidayClassIds.has(c.id);
              const inWindow = !isHoliday && isInClockInWindow(c.time_start, c.time_end);
              return (
                <Card key={c.id} className={isHoliday ? "opacity-60" : ""}>
                  <div className="flex items-start gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isHoliday ? "bg-warn-50 text-warn-500" : "bg-wave-50 text-wave-600"}`}>
                      <Icon name={isHoliday ? "flag" : "swim"} className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{c.name}</div>
                        {isHoliday && <Status kind="holiday">Libur</Status>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5 font-mono">{c.schedule_time} · {c.enrolled}/{c.capacity} member</div>
                      {!isHoliday && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {inWindow ? (
                            <Btn variant="primary" size="sm" icon="camera" onClick={() => setOverlay("clockin")}>Clock-In</Btn>
                          ) : (
                            <div className="text-xs text-ink-mute font-semibold flex items-center gap-1">
                              <Icon name="clock" className="w-3.5 h-3.5" />
                              Di luar window — hubungi admin untuk input manual
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {subClasses.map((s) => {
              const subClass = classes.find(c => c.id === s.classId);
              const inWindow = subClass ? isInClockInWindow(subClass.time_start, subClass.time_end) : false;
              return (
                <Card key={s.classId} className="border-sub-200 bg-sub-50/30">
                  <div className="flex items-start gap-3">
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-sub-100 text-sub-600">
                      <Icon name="refresh" className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{s.className}</div>
                        <Status kind="substitute">Pengganti</Status>
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5">Menggantikan: {s.originalCoach}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {inWindow ? (
                          <Btn variant="primary" size="sm" icon="camera" onClick={() => setOverlay("clockin")}>Clock-In</Btn>
                        ) : (
                          <div className="text-xs text-ink-mute font-semibold flex items-center gap-1">
                            <Icon name="clock" className="w-3.5 h-3.5" />
                            Di luar window — hubungi admin untuk input manual
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setOverlay("leave")} className="p-4 rounded-xl bg-paper-tint hover:bg-ocean-50 border border-line text-left">
            <span className="w-9 h-9 rounded-lg bg-white text-ocean-600 flex items-center justify-center mb-2"><Icon name="clipboard" className="w-4 h-4" /></span>
            <div className="font-bold text-sm text-ink">Ajukan Izin</div>
            <div className="text-xs text-ink-mute mt-0.5">Izin · sakit · pengganti</div>
          </button>
          <button className="p-4 rounded-xl bg-paper-tint hover:bg-ocean-50 border border-line text-left">
            <span className="w-9 h-9 rounded-lg bg-white text-wave-600 flex items-center justify-center mb-2"><Icon name="invoice" className="w-4 h-4" /></span>
            <div className="font-bold text-sm text-ink">Generate Invoice</div>
            <div className="text-xs text-ink-mute mt-0.5">PDF bulanan untuk owner</div>
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── Absensi ────────────────────────────────────────────────────────────────────

function CoachAbsensi({ setOverlay, coachId, branchId, classes, holidayClassIds }: {
  setOverlay: (v: string) => void;
  coachId: string; branchId: string; classes: ClassRow[]; holidayClassIds: Set<string>;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openManual, setOpenManual] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [manualClassId, setManualClassId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [memberAtt, setMemberAtt] = useState<MemberAttRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [attStatus, setAttStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    supabase.from("coach_attendances")
      .select("id, session_date, clock_in_time, distance_meters, is_manual, manual_note, status, class:classes(name), manual_by_profile:profiles!coach_attendances_manual_by_fkey(full_name)")
      .eq("coach_id", coachId).order("session_date", { ascending: false }).order("clock_in_time", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHistory(data as unknown as AttendanceRow[]); setLoading(false); });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMembers = useCallback(async (classId: string, date: string) => {
    const { data } = await supabase.from("members")
      .select("id, profile:profiles(full_name, birth_date)")
      .in("id",
        (await supabase.from("member_classes").select("member_id").eq("class_id", classId).then(r => r.data?.map(m => m.member_id) ?? []))
      );
    if (data) {
      const rows = data.map(m => ({ id: "", member_id: m.id, session_date: date, status: "hadir", member: (m as { profile: { full_name: string; birth_date: string | null } | null }).profile }));
      setMemberAtt(rows as unknown as MemberAttRow[]);
      const init: Record<string, string> = {};
      data.forEach(m => { init[m.id] = "hadir"; });
      setAttStatus(init);
    }
  }, [supabase]);

  useEffect(() => {
    if (manualClassId && manualDate) loadMembers(manualClassId, manualDate);
  }, [manualClassId, manualDate, loadMembers]);

  const saveManualAtt = async () => {
    if (!manualClassId || !manualDate) return toast.error("Kelas dan tanggal wajib diisi");
    setSaving(true);
    const rows = memberAtt.map(m => ({ class_id: manualClassId, member_id: m.member_id, session_date: manualDate, status: (attStatus[m.member_id] ?? "hadir") as "hadir" | "izin" | "sakit" | "tidak_hadir", method: "manual" as const }));
    const { error } = await supabase.from("member_attendances").upsert(rows, { onConflict: "class_id,member_id,session_date" });
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Absensi member disimpan");
    setOpenManual(false);
  };

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const todayClasses = classes.filter(c => (c.schedule_days ?? []).includes(todayName));

  if (showQR) {
    return <QRScanner coachId={coachId} classes={classes} onClose={() => setShowQR(false)} />;
  }

  return (
    <div className="space-y-5">
      <SectionTitle sub="Kelas yang sedang/akan berlangsung">Absen sekarang</SectionTitle>
      {todayClasses.length === 0 ? (
        <Card><p className="text-ink-mute text-sm">Tidak ada kelas hari ini.</p></Card>
      ) : (
        <div className="space-y-3">
          {todayClasses.map((c) => {
            const isHoliday = holidayClassIds.has(c.id);
            const inWindow = !isHoliday && isInClockInWindow(c.time_start, c.time_end);
            return (
              <Card key={c.id} className={isHoliday ? "opacity-60" : ""}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-bold text-ink">{c.name}</div>
                      {isHoliday && <Status kind="holiday">Libur</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{c.schedule_time}</div>
                  </div>
                  {!isHoliday && (inWindow ? (
                    <Btn variant="primary" size="md" icon="camera" onClick={() => setOverlay("clockin")}>Clock-In</Btn>
                  ) : (
                    <div className="text-right">
                      <div className="text-xs font-semibold text-ink-mute">Di luar window</div>
                      <div className="text-[10px] text-ink-faint">Hubungi admin</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-ocean-50 border-ocean-100">
          <Icon name="qr" className="w-8 h-8 text-ocean-600 mb-2" />
          <div className="font-display font-bold text-ink">Scan QR Member</div>
          <p className="text-xs text-ink-mute mt-1">Otomatis deteksi kelas yang sedang berjalan</p>
          <Btn variant="primary" size="sm" className="mt-3 w-full" onClick={() => setShowQR(true)}>Buka kamera</Btn>
        </Card>
        <Card>
          <Icon name="edit" className="w-8 h-8 text-wave-600 mb-2" />
          <div className="font-display font-bold text-ink">Absen Manual</div>
          <p className="text-xs text-ink-mute mt-1">Checklist member per kelas</p>
          <Btn variant="soft" size="sm" className="mt-3 w-full" onClick={() => setOpenManual(true)}>Pilih kelas</Btn>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 border-b border-line"><SectionTitle sub="20 absensi terakhir">History Absensi</SectionTitle></div>
        {loading ? <div className="p-6 text-center text-ink-mute">Memuat…</div> : (
          <div className="divide-y divide-line">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.is_manual ? "bg-manual-50 text-manual-500" : "bg-ok-50 text-ok-600"}`}>
                  <Icon name={h.is_manual ? "edit" : "check"} className="w-4 h-4" strokeWidth={2.4} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-ink text-sm">{h.class?.name}</div>
                    {h.is_manual && <Status kind="manual">Manual — oleh Admin</Status>}
                  </div>
                  <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)} · {h.clock_in_time?.slice(0, 5) ?? "—"}{h.distance_meters != null ? ` · ${h.distance_meters}m` : ""}</div>
                  {h.is_manual && h.manual_by_profile && (
                    <div className="text-[10px] text-ink-faint mt-0.5">oleh: {h.manual_by_profile.full_name}{h.manual_note ? ` · "${h.manual_note}"` : ""}</div>
                  )}
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="p-6 text-center text-ink-mute">Belum ada absensi.</div>}
          </div>
        )}
      </Card>

      <Modal open={openManual} onClose={() => setOpenManual(false)} title="Absensi Manual Member"
        footer={<><Btn variant="ghost" onClick={() => setOpenManual(false)}>Batal</Btn><Btn variant="primary" onClick={saveManualAtt} disabled={saving}>{saving ? "Menyimpan…" : "Submit"}</Btn></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kelas" required>
              <Select value={manualClassId} onChange={e => setManualClassId(e.target.value)}>
                <option value="">Pilih kelas…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Tanggal sesi" required><Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} /></Field>
          </div>
          {memberAtt.length > 0 && (
            <div className="space-y-2">
              {memberAtt.map((m) => (
                <div key={m.member_id} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                  <Avatar name={m.member?.full_name ?? "?"} size={36} />
                  <div className="flex-1 min-w-0"><div className="font-semibold text-ink text-sm truncate">{m.member?.full_name}</div></div>
                  <div className="flex gap-1">
                    {[["hadir", "Hadir"], ["izin", "Izin"], ["sakit", "Sakit"], ["tidak_hadir", "Absen"]].map(([id, l]) => (
                      <button key={id} onClick={() => setAttStatus(s => ({ ...s, [m.member_id]: id }))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${attStatus[m.member_id] === id ? "border-ok-500 bg-ok-50 text-ok-600" : "border-line text-ink-mute hover:bg-paper-tint"}`}>{l}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ── Spreadsheet Program ────────────────────────────────────────────────────────

interface ProgramRow { id?: string; week: number; topic: string; description: string }

function SpreadsheetModal({ classId, coachId, className, onClose }: {
  classId: string; coachId: string; className: string; onClose: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [rows, setRows] = useState<ProgramRow[]>([
    { week: 1, topic: "", description: "" },
    { week: 2, topic: "", description: "" },
    { week: 3, topic: "", description: "" },
    { week: 4, topic: "", description: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.from("class_programs")
      .select("id, week, topic, description")
      .eq("class_id", classId)
      .eq("month", month)
      .order("week")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRows([1, 2, 3, 4].map(w => {
            const existing = data.find(r => r.week === w);
            return { week: w, topic: existing?.topic ?? "", description: existing?.description ?? "", id: existing?.id };
          }));
        } else {
          setRows([1, 2, 3, 4].map(w => ({ week: w, topic: "", description: "" })));
        }
        setLoading(false);
      });
  }, [classId, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const filled = rows.filter(r => r.topic.trim());
    if (filled.length === 0) return toast.error("Isi minimal 1 baris materi");
    setSaving(true);
    const upsertRows = filled.map(r => ({
      class_id: classId, coach_id: coachId, month, week: r.week,
      topic: r.topic.trim(), description: r.description.trim(),
    }));
    const { error } = await supabase.from("class_programs")
      .upsert(upsertRows, { onConflict: "class_id,month,week" });
    if (!error) {
      // Mark spreadsheet as filled
      await supabase.from("classes").update({ spreadsheet_filled: true }).eq("id", classId);
    }
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    toast.success("Program tersimpan");
    onClose();
  };

  const updateRow = (week: number, field: "topic" | "description", val: string) => {
    setRows(prev => prev.map(r => r.week === week ? { ...r, [field]: val } : r));
  };

  return (
    <Modal open onClose={onClose} title={`Spreadsheet Program — ${className}`} size="lg"
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan program"}</Btn></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Field label="Bulan" className="!mb-0">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="!w-40 font-mono" />
          </Field>
        </div>
        {loading ? <div className="text-ink-mute text-sm py-4 text-center">Memuat…</div> : (
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.week} className="p-4 rounded-xl border border-line bg-paper-tint space-y-2">
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Minggu {r.week}</div>
                <Field label="Topik / materi" className="!mb-0">
                  <Input value={r.topic} onChange={e => updateRow(r.week, "topic", e.target.value)} placeholder="Mis. Gaya bebas — fase tarikan lengan" />
                </Field>
                <Field label="Deskripsi (opsional)" className="!mb-0">
                  <Input value={r.description} onChange={e => updateRow(r.week, "description", e.target.value)} placeholder="Penjelasan singkat latihan minggu ini" />
                </Field>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Kelas ──────────────────────────────────────────────────────────────────────

function CoachKelas({ classes, coachId }: { classes: ClassRow[]; coachId: string }) {
  const [det, setDet] = useState<ClassRow | null>(null);
  const [openSpreadsheet, setOpenSpreadsheet] = useState<ClassRow | null>(null);

  return (
    <div className="space-y-5">
      <SectionTitle sub={`${classes.length} kelas`}>Kelas Anda</SectionTitle>
      <div className="space-y-3">
        {classes.map((c) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-lift transition" onClick={() => setDet(c)}>
            <div className="flex items-start gap-3">
              <Placeholder label="cls" ratio="1/1" className="!w-20 !aspect-square shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-ink">{c.name}</div>
                <div className="text-xs text-ink-mute mt-0.5">{(c.schedule_days ?? []).join(", ")}</div>
                <div className="text-xs text-ocean-700 font-semibold mt-1.5 font-mono">{c.schedule_time}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-ink-mute">
                  <span className="inline-flex items-center gap-1"><Icon name="users" className="w-3.5 h-3.5" />{c.enrolled}/{c.capacity}</span>
                </div>
              </div>
              <Btn variant="soft" size="sm" icon="book" onClick={e => { e.stopPropagation(); setOpenSpreadsheet(c); }}>Program</Btn>
            </div>
          </Card>
        ))}
        {classes.length === 0 && <Card><p className="text-ink-mute text-sm">Belum ada kelas yang diassign.</p></Card>}
      </div>
      <Modal open={!!det} onClose={() => setDet(null)} title={det?.name ?? ""} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setDet(null)}>Tutup</Btn><Btn variant="soft" size="sm" icon="book" onClick={() => { setOpenSpreadsheet(det); setDet(null); }}>Isi Program</Btn></>}>
        {det && (
          <div className="space-y-4">
            {det.goals && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tujuan</div><p className="text-sm text-ink-soft mt-1">{det.goals}</p></div>}
            <div>
              <SectionTitle sub={`${det.enrolled} member terdaftar`}>Daftar Member</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-2">
                {(det.member_classes ?? []).map((mc, i) => mc.member && (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-line">
                    <Avatar name={mc.member.profile?.full_name ?? "?"} size={34} />
                    <div className="flex-1 min-w-0"><div className="font-semibold text-sm text-ink truncate">{mc.member.profile?.full_name ?? "—"}</div></div>
                    {mc.member.profile?.phone && (
                      <a href={waLink(`Halo ${mc.member.profile.full_name}, saya Coach dari Next Swimming School.`)} target="_blank" rel="noreferrer">
                        <Icon name="whatsapp" className="w-4 h-4 text-[#25D366]" />
                      </a>
                    )}
                  </div>
                ))}
                {(det.member_classes?.length ?? 0) === 0 && <div className="text-sm text-ink-mute">Belum ada member terdaftar.</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>
      {openSpreadsheet && (
        <SpreadsheetModal
          classId={openSpreadsheet.id}
          coachId={coachId}
          className={openSpreadsheet.name}
          onClose={() => setOpenSpreadsheet(null)}
        />
      )}
    </div>
  );
}

// ── Invoice ────────────────────────────────────────────────────────────────────

function CoachInvoice({ coachId, branchId, profile }: { coachId: string; branchId: string; profile: ProfileData | null }) {
  const supabase = createClient();
  const toast = useToast();
  const [sessions, setSessions] = useState<InvoiceSession[]>([]);
  const [pastInvoices, setPastInvoices] = useState<PastInvoice[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [y, m] = monthFilter.split("-");
    const start = `${y}-${m}-01`;
    const end = new Date(parseInt(y), parseInt(m), 0).toISOString().split("T")[0];

    const { data: att } = await supabase.from("coach_attendances")
      .select("id, session_date, class_id, class:classes(id, name)")
      .eq("coach_id", coachId).eq("status", "present")
      .gte("session_date", start).lte("session_date", end)
      .is("invoice_id", null);

    if (att) {
      // Get rates for each class
      const classIds = [...new Set(att.map((a: Record<string, unknown>) => a.class_id as string).filter(Boolean))];
      const { data: rates } = await supabase.from("coach_rates").select("class_id, rate_per_session").is("coach_id", null).in("class_id", classIds as string[]);
      const rateMap: Record<string, number> = {};
      (rates ?? []).forEach((r: { class_id: string; rate_per_session: number | null }) => { if (r.rate_per_session != null) rateMap[r.class_id] = r.rate_per_session; });

      const sessionsWithRate = att.map((a: Record<string, unknown>) => {
        const cls = a.class as { id?: string; name?: string } | null;
        return { id: a.id as string, session_date: a.session_date as string, class_id: a.class_id as string, rate_per_session: rateMap[a.class_id as string] ?? 150000, class: cls ? { name: cls.name ?? "" } : null };
      });
      setSessions(sessionsWithRate);
      setSelected(new Set(sessionsWithRate.map((s: InvoiceSession) => s.id)));
    }

    const { data: inv } = await supabase.from("coach_invoices").select("id, invoice_number, period_label, total_amount, status").eq("coach_id", coachId).order("created_at", { ascending: false });
    if (inv) setPastInvoices(inv as PastInvoice[]);
    setLoading(false);
  }, [coachId, monthFilter, supabase]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const total = sessions.filter(s => selected.has(s.id)).reduce((a, s) => a + s.rate_per_session, 0);

  const generate = async () => {
    if (selected.size === 0) return toast.error("Pilih minimal 1 sesi");
    setGenerating(true);
    const [y, m] = monthFilter.split("-");
    const periodLabel = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const num = `INV-${monthFilter.replace("-", "")}-${coachId.slice(0, 6).toUpperCase()}`;

    const { data: inv, error: invError } = await supabase.from("coach_invoices").insert({
      coach_id: coachId, branch_id: branchId, invoice_number: num,
      period_label: periodLabel, total_amount: total,
      bank_info: profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null, status: "pending",
    }).select("id").single();

    if (invError || !inv) { toast.error("Gagal membuat invoice", invError?.message); setGenerating(false); return; }

    // Link sessions to invoice
    const selectedSessions = sessions.filter(s => selected.has(s.id));
    await supabase.from("coach_invoice_items").insert(selectedSessions.map(s => ({
      invoice_id: inv.id, attendance_id: s.id, class_id: s.class_id, rate: s.rate_per_session, session_count: 1,
    })));
    // Mark attendances as invoiced
    await supabase.from("coach_attendances").update({ invoice_id: inv.id }).in("id", [...selected]);

    setGenerating(false);
    toast.success("Invoice dibuat", "Invoice masuk ke owner panel");
    load();
  };

  return (
    <div className="space-y-5">
      <Card className="bg-ocean-700 text-white border-ocean-700 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">Generate invoice</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">{new Date(monthFilter + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h2>
          <p className="text-white/80 text-sm mt-1">Pilih sesi yang ingin dimasukkan ke invoice.</p>
        </div>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="!w-44 font-mono" />
        <button onClick={() => setSelected(new Set(sessions.map(s => s.id)))} className="text-sm font-bold text-ocean-600 hover:text-ocean-700">Pilih semua</button>
      </div>
      {loading ? <div className="text-center text-ink-mute p-6">Memuat sesi…</div> : (
        <>
          <Card padded={false}>
            {sessions.length === 0 ? <div className="p-6 text-center text-ink-mute">Tidak ada sesi yang belum diinvoice bulan ini.</div> : (
              <div className="divide-y divide-line">
                {sessions.map((s) => (
                  <label key={s.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-paper-tint cursor-pointer ${selected.has(s.id) ? "bg-ocean-50/40" : ""}`}>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 rounded border-line-strong text-ocean-600" />
                    <div className="flex-1 min-w-0"><div className="font-semibold text-ink text-sm">{s.class?.name}</div><div className="text-xs text-ink-mute">{fmtDate(s.session_date)}</div></div>
                    <div className="font-mono font-bold text-sm">{fmtIDR(s.rate_per_session)}</div>
                  </label>
                ))}
              </div>
            )}
          </Card>
          <Card className="bg-paper-tint">
            <div className="flex items-baseline justify-between">
              <div className="text-[11px] uppercase tracking-widest font-bold text-ink-faint">Total ({selected.size} sesi)</div>
              <div className="font-display font-extrabold text-2xl text-ocean-700">{fmtIDR(total)}</div>
            </div>
            <Btn variant="primary" size="lg" className="w-full mt-4" icon="invoice" onClick={generate} disabled={generating || selected.size === 0}>
              {generating ? "Membuat invoice…" : "Generate Invoice"}
            </Btn>
          </Card>
        </>
      )}
      {pastInvoices.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub="Invoice yang sudah pernah dibuat">History Invoice</SectionTitle></div>
          <div className="divide-y divide-line">
            {pastInvoices.map((iv) => (
              <div key={iv.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint">
                <span className="w-10 h-10 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center"><Icon name="invoice" className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0"><div className="font-semibold text-ink text-sm font-mono">{iv.invoice_number}</div><div className="text-xs text-ink-mute">{iv.period_label}</div></div>
                <div className="font-mono font-bold text-sm">{fmtIDR(iv.total_amount)}</div>
                <Status kind={iv.status === "paid" ? "paid" : iv.status === "pending" ? "pending" : "unpaid"}>{iv.status === "paid" ? "Lunas" : "Pending"}</Status>
                <button title="Cetak / Unduh PDF" onClick={() => {
                  const w = window.open("", "_blank", "width=700,height=900");
                  if (!w) return;
                  w.document.write(`<!DOCTYPE html><html><head><title>${iv.invoice_number}</title>
                    <style>body{font-family:sans-serif;padding:32px;color:#0f172a;max-width:600px;margin:auto}
                    h1{font-size:22px;font-weight:700}
                    .meta{color:#64748b;font-size:13px;margin-bottom:24px}
                    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
                    .total{display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:8px}
                    .status{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;background:${iv.status === "paid" ? "#dcfce7" : "#fef9c3"};color:${iv.status === "paid" ? "#166534" : "#854d0e"}}
                    footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8}
                    </style></head><body>
                    <h1>${iv.invoice_number}</h1>
                    <div class="meta">
                      Periode: ${iv.period_label}<br/>
                      Coach: ${profile?.full_name ?? "—"}<br/>
                      Rekening: ${profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : "—"}<br/>
                      Status: <span class="status">${iv.status === "paid" ? "Lunas" : "Pending"}</span>
                    </div>
                    <div class="total"><span>Total</span><span>Rp ${iv.total_amount.toLocaleString("id-ID")}</span></div>
                    <footer>Next Swimming School · ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</footer>
                    </body></html>`);
                  w.document.close();
                  w.focus();
                  w.print();
                }} className="w-8 h-8 rounded-lg border border-line hover:bg-paper-tint flex items-center justify-center text-ink-mute hover:text-ocean-600">
                  <Icon name="print" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Rapor ──────────────────────────────────────────────────────────────────────

interface Criterion {
  id: string; label: string;
  kind: "score_10" | "score_100" | "choice" | "text";
  options: string[] | null;
}

function CoachRapor({ coachId, branchId }: { coachId: string; branchId: string }) {
  const supabase = createClient();
  const toast = useToast();
  const [period, setPeriod] = useState<{ id: string; label: string; date_to: string } | null>(null);
  const [entries, setEntries] = useState<RaporEntry[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<RaporEntry | null>(null);
  const [scores, setScores] = useState<Record<string, number | string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    supabase.from("rapor_periods").select("id, label, date_to").eq("branch_id", branchId).eq("is_open", true).single()
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        setPeriod(data as { id: string; label: string; date_to: string });
        supabase.from("rapor_entries")
          .select("id, member_id, class_id, locked, scores, notes, member:members(profile:profiles(full_name)), class:classes(name, class_criteria(id, label, kind, options, sort_order))")
          .eq("period_id", data.id).eq("coach_id", coachId)
          .then(({ data: e }) => { if (e) setEntries(e as unknown as RaporEntry[]); setLoading(false); });
      });
  }, [coachId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEntry = (e: RaporEntry) => {
    // Load criteria for this class
    const classCriteria = ((e as unknown as { class?: { class_criteria?: Criterion[] } }).class?.class_criteria ?? [])
      .sort((a, b) => ((a as unknown as { sort_order: number }).sort_order ?? 0) - ((b as unknown as { sort_order: number }).sort_order ?? 0));
    setCriteria(classCriteria as Criterion[]);
    // Pre-fill existing scores
    const existing = (e as unknown as { scores?: Record<string, number | string> }).scores ?? {};
    setScores(existing);
    setNotes((e as unknown as { notes?: string }).notes ?? "");
    setOpen(e);
  };

  const saveRapor = async () => {
    if (!open || !period) return;
    setSaving(true);
    const { error } = await supabase.from("rapor_entries").upsert({
      id: open.id || undefined,
      period_id: period.id, member_id: open.member_id, class_id: open.class_id, coach_id: coachId,
      scores, notes, filled_at: new Date().toISOString(), locked: true,
    }, { onConflict: "period_id,member_id" });
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan rapor", error.message);
    toast.success("Rapor disimpan");
    setOpen(null);
    setEntries(prev => prev.map(e => e.member_id === open.member_id ? { ...e, locked: true } : e));
  };

  return (
    <div className="space-y-5">
      {period ? (
        <Card className="bg-ocean-700 text-white border-ocean-700 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-wave-500/30 blur-2xl" />
          <div className="relative">
            <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> Periode aktif</div>
            <div className="font-display font-bold text-2xl mt-0.5">{period.label}</div>
            <p className="text-white/80 text-sm mt-1">{entries.filter(e => e.locked).length}/{entries.length} member sudah diisi</p>
          </div>
        </Card>
      ) : (
        <Card><p className="text-ink-mute">Tidak ada periode rapor aktif.</p></Card>
      )}
      {loading ? <div className="text-ink-mute text-sm">Memuat…</div> : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id || e.member_id} className="flex items-center gap-3">
              <Avatar name={e.member?.profile?.full_name ?? "?"} size={40} />
              <div className="flex-1 min-w-0"><div className="font-semibold text-ink truncate">{e.member?.profile?.full_name}</div><div className="text-xs text-ink-mute">{e.class?.name}</div></div>
              {e.locked ? <Status kind="approved">Selesai</Status> : <Status kind="pending">Belum</Status>}
              <Btn variant={e.locked ? "ghost" : "primary"} size="sm" onClick={() => openEntry(e)}>
                {e.locked ? "Edit" : "Isi rapor"}
              </Btn>
            </Card>
          ))}
          {entries.length === 0 && period && <p className="text-ink-mute text-sm">Belum ada entri rapor untuk periode ini.</p>}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={`Rapor — ${open?.member?.profile?.full_name ?? ""}`} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setOpen(null)}>Batal</Btn><Btn variant="primary" onClick={saveRapor} disabled={saving}>{saving ? "Menyimpan…" : "Simpan rapor"}</Btn></>}>
        <div className="space-y-5">
          {criteria.length === 0 && (
            <p className="text-xs text-warn-600">Aspek penilaian belum dikonfigurasi admin untuk kelas ini.</p>
          )}
          {criteria.map((c) => (
            <div key={c.id}>
              <div className="font-semibold text-ink text-sm mb-2">{c.label}</div>
              {(c.kind === "score_10" || c.kind === "score_100") && (() => {
                const max = c.kind === "score_10" ? 10 : 100;
                return (
                  <>
                    <input type="range" min={0} max={max} value={(scores[c.id] as number) ?? 0}
                      onChange={e => setScores(s => ({ ...s, [c.id]: Number(e.target.value) }))} className="w-full" />
                    <div className="flex justify-between text-[10px] font-mono text-ink-mute mt-1">
                      <span>0</span><span className="font-bold text-ocean-700">{(scores[c.id] as number) ?? 0}/{max}</span><span>{max}</span>
                    </div>
                  </>
                );
              })()}
              {c.kind === "choice" && c.options && (
                <div className="flex flex-wrap gap-2">
                  {c.options.map((opt) => (
                    <button key={opt} onClick={() => setScores(s => ({ ...s, [c.id]: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${scores[c.id] === opt ? "bg-ocean-700 text-white border-ocean-700" : "bg-white border-line text-ink-soft hover:border-ocean-300"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {c.kind === "text" && (
                <Textarea rows={2} value={(scores[c.id] as string) ?? ""}
                  onChange={e => setScores(s => ({ ...s, [c.id]: e.target.value }))} placeholder={`Catatan ${c.label.toLowerCase()}…`} />
              )}
            </div>
          ))}
          <Field label="Catatan umum coach"><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Feedback keseluruhan untuk member…" /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────

function CoachProfile({ profile, onRefresh }: { profile: ProfileData | null; onRefresh: () => void }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { upload, uploading } = useUpload();
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [openAddCert, setOpenAddCert] = useState(false);
  const [editCertTarget, setEditCertTarget] = useState<{ id: string; title: string; valid_from: string | null; valid_until: string | null; status: string } | null>(null);
  const [certForm, setCertForm] = useState({ title: "", issuer: "", issued_at: "", expires_at: "" });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [savingCert, setSavingCert] = useState(false);
  const [openEditBank, setOpenEditBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", bank_account: "", bank_holder: "" });
  const [savingBank, setSavingBank] = useState(false);
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: "", specialization: "", address: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const changePassword = async () => {
    if (!newPwd || newPwd.length < 6) return toast.error("Password minimal 6 karakter");
    if (newPwd !== confirmPwd) return toast.error("Password tidak cocok");
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setSavingPwd(false);
    if (error) return toast.error("Gagal ganti password", error.message);
    toast.success("Password diubah");
    setNewPwd(""); setConfirmPwd("");
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload.avatar(file);
    if (url) { toast.success("Foto profil diperbarui"); onRefresh(); }
  };

  const saveCert = async () => {
    if (!certForm.title || !certForm.issued_at) return toast.error("Judul dan tanggal wajib diisi");
    setSavingCert(true);
    const { data: cert, error } = await supabase.from("certifications").insert({
      coach_id: profile?.id, name: certForm.title, issuer: certForm.issuer || null,
      valid_from: certForm.issued_at || null, valid_until: certForm.expires_at || null, status: "pending",
    }).select("id").single();

    if (cert && certFile) {
      try {
        const url = await upload.cert(certFile, cert.id);
        if (url) await supabase.from("certifications").update({ photo_url: url }).eq("id", cert.id);
      } catch {}
    }
    setSavingCert(false);
    if (error) return toast.error("Gagal menambah sertifikasi", error.message);
    toast.success("Sertifikasi ditambahkan", "Menunggu verifikasi admin");
    setOpenAddCert(false);
    onRefresh();
  };

  const openCertEdit = (s: { id: string; title: string; valid_from: string | null; valid_until: string | null; status: string }) => {
    setEditCertTarget(s);
    setCertForm({ title: s.title, issuer: "", issued_at: s.valid_from ?? "", expires_at: s.valid_until ?? "" });
    setCertFile(null);
    setOpenAddCert(true);
  };

  const deleteCert = async (s: { id: string; title: string }) => {
    const ok = await confirm({ title: "Hapus sertifikasi?", message: `Hapus "${s.title}"? Tindakan ini tidak bisa dibatalkan.`, confirmLabel: "Hapus", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("certifications").delete().eq("id", s.id);
    if (error) return toast.error("Gagal menghapus", error.message);
    toast.success("Sertifikasi dihapus");
    onRefresh();
  };

  const saveCertEdit = async () => {
    if (!editCertTarget || !certForm.title || !certForm.issued_at) return toast.error("Judul dan tanggal wajib diisi");
    setSavingCert(true);
    const { error } = await supabase.from("certifications").update({
      name: certForm.title, issuer: certForm.issuer || null,
      valid_from: certForm.issued_at || null, valid_until: certForm.expires_at || null,
    }).eq("id", editCertTarget.id);
    if (!error && certFile) {
      try {
        const url = await upload.cert(certFile, editCertTarget.id);
        if (url) await supabase.from("certifications").update({ photo_url: url }).eq("id", editCertTarget.id);
      } catch {}
    }
    setSavingCert(false);
    if (error) return toast.error("Gagal memperbarui sertifikasi", error.message);
    toast.success("Sertifikasi diperbarui");
    setOpenAddCert(false);
    setEditCertTarget(null);
    onRefresh();
  };

  const openBankEdit = () => {
    setBankForm({ bank_name: profile?.bank_name ?? "", bank_account: profile?.bank_account ?? "", bank_holder: profile?.bank_holder ?? "" });
    setOpenEditBank(true);
  };

  const saveBank = async () => {
    if (!bankForm.bank_name || !bankForm.bank_account || !bankForm.bank_holder) return toast.error("Semua field rekening wajib diisi");
    setSavingBank(true);
    const { error } = await supabase.from("profiles").update({
      bank_name: bankForm.bank_name, bank_account: bankForm.bank_account, bank_holder: bankForm.bank_holder,
    }).eq("id", profile?.id);
    setSavingBank(false);
    if (error) return toast.error("Gagal menyimpan rekening", error.message);
    toast.success("Informasi rekening diperbarui");
    setOpenEditBank(false);
    onRefresh();
  };

  const openProfileEdit = () => {
    setProfileForm({
      phone: profile?.phone ?? "",
      specialization: profile?.specialization ?? "",
      address: (profile as unknown as { address?: string | null })?.address ?? "",
      bio: (profile as unknown as { bio?: string | null })?.bio ?? "",
    });
    setOpenEditProfile(true);
  };

  const saveProfileInfo = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      phone: profileForm.phone || null,
      specialization: profileForm.specialization || null,
      address: profileForm.address || null,
      bio: profileForm.bio || null,
    }).eq("id", profile?.id);
    setSavingProfile(false);
    if (error) return toast.error("Gagal menyimpan profil", error.message);
    toast.success("Profil diperbarui");
    setOpenEditProfile(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-4">
          <label className="cursor-pointer relative group">
            <Avatar name={profile?.full_name ?? "C"} size={72} src={profile?.avatar_url ?? undefined} />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Icon name="camera" className="w-5 h-5 text-white" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={handleAvatar} disabled={uploading} />
          </label>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink">{profile?.full_name ?? "—"}</div>
            <div className="text-sm text-ocean-700 font-semibold">{profile?.specialization ?? "Coach"}</div>
          </div>
          <Btn variant="ghost" size="sm" icon="edit" onClick={openProfileEdit}>Edit</Btn>
        </div>
        <div className="mt-5 pt-5 border-t border-line grid sm:grid-cols-2 gap-3 text-sm">
          <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Email</div><div className="font-semibold text-ink">{profile?.email ?? "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">WhatsApp</div><div className="font-semibold text-ink font-mono">{profile?.phone ?? "—"}</div></div>
        </div>
        <div className="mt-4 pt-4 border-t border-line">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Informasi Rekening</div>
            <Btn variant="ghost" size="sm" icon="edit" onClick={openBankEdit}>Edit rekening</Btn>
          </div>
          {profile?.bank_name ? (
            <div className="mt-1.5 text-sm font-semibold text-ink">{profile.bank_name} · {profile.bank_account} a/n {profile.bank_holder}</div>
          ) : (
            <div className="mt-1.5 text-sm text-warn-600 font-semibold">Belum diisi — diperlukan untuk generate invoice</div>
          )}
        </div>
      </Card>
      <Card padded={false}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <SectionTitle sub="Perlu approve admin saat ditambahkan">Sertifikasi</SectionTitle>
          <Btn variant="soft" size="sm" icon="plus" onClick={() => setOpenAddCert(true)}>Tambah</Btn>
        </div>
        <div className="divide-y divide-line">
          {(profile?.certifications ?? []).map((s) => (
            <div key={s.id} className="px-5 py-3 flex items-center gap-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.status === "approved" ? "bg-ok-50 text-ok-600" : "bg-warn-50 text-warn-600"}`}><Icon name="shield" className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0"><div className="font-semibold text-ink text-sm">{s.title}</div>{s.valid_from && <div className="text-xs text-ink-mute font-mono">{s.valid_from}{s.valid_until ? ` – ${s.valid_until}` : ""}</div>}</div>
              <Status kind={s.status as "approved" | "pending"}>{s.status === "approved" ? "Disetujui" : "Menunggu"}</Status>
              <div className="flex items-center gap-1">
                <button onClick={() => openCertEdit(s)} className="p-1.5 rounded hover:bg-paper-tint text-ink-mute hover:text-ink" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                <button onClick={() => deleteCert(s)} className="p-1.5 rounded hover:bg-danger-50 text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {(profile?.certifications?.length ?? 0) === 0 && <div className="px-5 py-4 text-sm text-ink-mute">Belum ada sertifikasi.</div>}
        </div>
      </Card>
      <Card>
        <SectionTitle>Ganti password</SectionTitle>
        <div className="space-y-3">
          <Field label="Password baru"><Input type="password" placeholder="Password baru" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></Field>
          <Field label="Konfirmasi"><Input type="password" placeholder="Ulangi password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></Field>
          <Btn variant="primary" size="md" onClick={changePassword} disabled={savingPwd}>{savingPwd ? "Menyimpan…" : "Simpan password baru"}</Btn>
        </div>
      </Card>
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setEditCertTarget(null); }} title={editCertTarget ? "Edit Sertifikasi" : "Tambah Sertifikasi"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setEditCertTarget(null); }}>Batal</Btn><Btn variant="primary" onClick={editCertTarget ? saveCertEdit : saveCert} disabled={savingCert}>{savingCert ? "Menyimpan…" : "Submit"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sertifikasi" required><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder="Mis. Lifeguard ARC" /></Field>
          <Field label="Penerbit"><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Mis. PMI / FINA" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal terbit" required><Input type="date" value={certForm.issued_at} onChange={e => setCertForm(f => ({ ...f, issued_at: e.target.value }))} /></Field>
            <Field label="Kadaluarsa"><Input type="date" value={certForm.expires_at} onChange={e => setCertForm(f => ({ ...f, expires_at: e.target.value }))} /></Field>
          </div>
          <Field label="Foto sertifikat" hint="Opsional, bantu proses verifikasi">
            <input type="file" accept="image/*" onChange={e => setCertFile(e.target.files?.[0] ?? null)} className="text-sm text-ink-soft" />
          </Field>
        </div>
      </Modal>

      <Modal open={openEditBank} onClose={() => setOpenEditBank(false)} title="Edit Informasi Rekening" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditBank(false)}>Batal</Btn><Btn variant="primary" onClick={saveBank} disabled={savingBank}>{savingBank ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama bank" required><Input value={bankForm.bank_name} onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Mis. BCA, BRI, Mandiri" /></Field>
          <Field label="Nomor rekening" required><Input value={bankForm.bank_account} onChange={e => setBankForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Nomor rekening" /></Field>
          <Field label="Atas nama" required><Input value={bankForm.bank_holder} onChange={e => setBankForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Nama pemilik rekening" /></Field>
        </div>
      </Modal>

      <Modal open={openEditProfile} onClose={() => setOpenEditProfile(false)} title="Edit Profil" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditProfile(false)}>Batal</Btn><Btn variant="primary" onClick={saveProfileInfo} disabled={savingProfile}>{savingProfile ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nomor WhatsApp"><Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          <Field label="Spesialisasi"><Input value={profileForm.specialization} onChange={e => setProfileForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Renang gaya bebas, anak-anak" /></Field>
          <Field label="Alamat"><Textarea value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap" rows={2} /></Field>
          <Field label="Bio / Deskripsi"><Textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} placeholder="Ceritakan sedikit tentang Anda…" rows={3} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState<TabId>("home");
  const [overlay, setOverlay] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles")
      .select("id, full_name, email, phone, specialization, bank_name, bank_account, bank_holder, avatar_url, is_profile_complete, suspend_until, suspend_reason, certifications(id, title, valid_from, valid_until, status)")
      .eq("id", userId).single();
    if (data) setProfile(data as unknown as ProfileData);
    return data as ProfileData | null;
  }, [supabase]);

  const loadClasses = useCallback(async (profileId: string) => {
    const { data } = await supabase.from("class_coaches").select("class:classes(id, name, schedule_days, schedule_time, time_start, time_end, capacity, enrolled, goals, member_classes(member:members(id, profile:profiles(full_name, birth_date, phone))))").eq("coach_id", profileId);
    if (!data) return;
    const rows = data.map((d: Record<string, unknown>) => d.class as ClassRow).filter(Boolean);
    setClasses(rows);
    // Load today's holidays for these classes
    const classIds = rows.map((c) => c.id);
    if (classIds.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: hols } = await supabase.from("class_holidays").select("class_id").in("class_id", classIds).eq("holiday_date", today);
      if (hols) setHolidayClassIds(new Set((hols as { class_id: string }[]).map((h) => h.class_id)));
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await loadProfile(u.id);
      if (p) loadClasses(p.id);
    });
  }, [loadProfile, loadClasses]); // eslint-disable-line react-hooks/exhaustive-deps

  const coachId = profile?.id ?? "";
  const branchId = user?.user_metadata?.branch_id as string ?? "";

  const isSuspended = profile?.suspend_until ? new Date(profile.suspend_until) >= new Date() : false;
  const isProfileComplete = profile?.is_profile_complete ?? true; // default true until profile loaded

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const title = active === "home" ? (profile?.full_name ?? "Coach") : {
    absen: "Absensi", kelas: "Kelas", invoice: "Invoice", rapor: "Rapor", profile: "Profile"
  }[active] ?? "";
  const sub = active === "home" ? `${todayName} · ${fmtDateLong(new Date())}` : {
    absen: "Clock-in & scan QR", kelas: "Kelas yang Anda handle",
    invoice: "Generate invoice bulanan", rapor: "Isi rapor member",
    profile: "Data pribadi & sertifikasi"
  }[active] ?? "";

  // Suspend countdown hook — ticks every second
  const [suspendCountdown, setSuspendCountdown] = useState("");
  useEffect(() => {
    if (!isSuspended || !profile?.suspend_until) { setSuspendCountdown(""); return; }
    const tick = () => {
      const diff = new Date(profile.suspend_until!).getTime() - Date.now();
      if (diff <= 0) { setSuspendCountdown("Segera aktif kembali…"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setSuspendCountdown(`${days}h ${hrs}j ${mins}m ${secs}d`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isSuspended, profile?.suspend_until]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suspend/incomplete banners shown at the top of each tab's content
  const SuspendBanner = isSuspended ? (
    <Card className="bg-danger-50 border-danger-300 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-danger-100 text-danger-600 flex items-center justify-center shrink-0 animate-pulse"><Icon name="warning" className="w-5 h-5" /></span>
        <div className="flex-1">
          <div className="font-display font-bold text-danger-700 text-base">Akun Anda sedang disuspend</div>
          {profile?.suspend_reason && <p className="text-sm text-danger-600 mt-1">Alasan: {profile.suspend_reason}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-danger-500 font-semibold">Aktif kembali dalam:</span>
            <span className="bg-danger-100 text-danger-700 font-mono text-xs font-bold px-2 py-0.5 rounded-lg">{suspendCountdown}</span>
          </div>
          <p className="text-xs text-danger-500 mt-1">Semua fitur tidak dapat diakses selama masa suspend. Hubungi admin cabang jika ada pertanyaan.</p>
        </div>
      </div>
    </Card>
  ) : null;

  const IncompleteBanner = (!isSuspended && profile && !isProfileComplete) ? (
    <Card className="bg-ocean-50 border-ocean-200 mb-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-ocean-100 text-ocean-600 flex items-center justify-center shrink-0"><Icon name="info" className="w-5 h-5" /></span>
        <div>
          <div className="font-display font-bold text-ocean-700">Lengkapi profil Anda</div>
          <p className="text-sm text-ocean-600 mt-1">Fitur Clock In, Invoice, dan Rapor akan terkunci sampai profil Anda dinyatakan lengkap oleh admin.</p>
        </div>
      </div>
    </Card>
  ) : null;

  // Lock active features when suspended or profile incomplete
  const locked = isSuspended || !isProfileComplete;

  const LockedNotice = ({ feature }: { feature: string }) => (
    <Card className="!p-8 text-center border-dashed border-2">
      <Icon name="lock" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
      <div className="font-display font-bold text-ink">{feature} tidak tersedia</div>
      <p className="text-sm text-ink-mute mt-1">
        {isSuspended ? "Akun Anda sedang disuspend." : "Lengkapi profil Anda terlebih dahulu."}
      </p>
    </Card>
  );

  const content = overlay === "clockin"
    ? (locked ? <LockedNotice feature="Clock-In" /> : <ClockInFlow back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} />)
    : overlay === "leave"
    ? <LeaveForm back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} />
    : {
        home:    <>{SuspendBanner}{IncompleteBanner}<CoachHome setOverlay={setOverlay} coachId={coachId} branchId={branchId} profile={profile} classes={classes} holidayClassIds={holidayClassIds} /></>,
        absen:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Absensi" /> : <CoachAbsensi setOverlay={setOverlay} coachId={coachId} branchId={branchId} classes={classes} holidayClassIds={holidayClassIds} />}</>,
        kelas:   <CoachKelas classes={classes} coachId={coachId} />,
        invoice: <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Invoice" /> : <CoachInvoice coachId={coachId} branchId={branchId} profile={profile} />}</>,
        rapor:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Rapor" /> : <CoachRapor coachId={coachId} branchId={branchId} />}</>,
        profile: <CoachProfile profile={profile} onRefresh={() => user && loadProfile(user.id)} />,
      }[active];

  return (
    <>
      <Shell active={active} setActive={setActive} title={overlay ? "Clock-In" : title} sub={overlay ? "" : sub} user={user}>
        {content}
      </Shell>
      <RoleSwitcher currentPath="/coach" />
    </>
  );
}
