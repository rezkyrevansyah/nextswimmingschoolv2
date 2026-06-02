"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import MobileNav from "@/components/layout/MobileNav";
import type { NavItem as MobileNavItem } from "@/components/layout/Sidebar";
import Bell from "@/components/layout/Bell";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { fmtIDR, fmtDate, fmtDateLong, waLink } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import type { User } from "@supabase/supabase-js";


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
  id: string; name: string; schedule_days: string[];
  time_start: string; time_end: string;
  capacity: number; enrolled: number; goals: string | null;
  class_type?: string;
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
  nick_name: string | null; gender: string | null; birth_date: string | null;
  phone: string | null; specialization: string | null;
  bio: string | null; address: string | null;
  education_level: string | null; education_institution: string | null;
  bank_name: string | null; bank_account: string | null; bank_holder: string | null;
  avatar_url: string | null;
  is_profile_complete: boolean;
  suspend_until: string | null;
  suspend_reason: string | null;
  certifications?: { id: string; title: string; issuer: string | null; valid_from: string | null; valid_until: string | null; photo_url: string | null; status: string; reject_reason: string | null }[];
}

// ── Shell ──────────────────────────────────────────────────────────────────────

function Shell({ children, active, onNav, title, sub, user, avatarUrl }: {
  children: React.ReactNode;
  active: TabId; onNav: (id: TabId) => void;
  title: string; sub: string; user: User | null; avatarUrl?: string | null;
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
              <button key={it.id} onClick={() => onNav(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon} className="w-4 h-4" /> {it.label}
              </button>
            ))}
          </div>
          <Bell userId={user?.id ?? ""} />
          <button onClick={() => onNav("profile")} title="Profile">
            <Avatar name={user?.user_metadata?.full_name ?? "C"} src={avatarUrl ?? undefined} size={36} />
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 lg:p-7">{children}</main>
      <MobileNav items={NAV_ITEMS} active={active} onSelect={(id) => onNav(id as TabId)} />
    </div>
  );
}

// ── Clock-In flow ──────────────────────────────────────────────────────────────

function ClockInFlow({ back, coachId, branchId, classes, preselectedClassId }: {
  back: () => void;
  coachId: string; branchId: string;
  classes: ClassRow[];
  preselectedClassId?: string;
}) {
  const toast = useToast();
  const { upload, uploading } = useUpload();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [classId, setClassId] = useState(preselectedClassId ?? classes[0]?.id ?? "");
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
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</option>)}
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
            // eslint-disable-next-line @next/next/no-img-element -- blob URL from camera capture, not suited for next/image
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

// ── Leave history ──────────────────────────────────────────────────────────────

interface LeaveHistoryRow {
  id: string; type: string; date_from: string; date_to: string;
  status: string; reason: string | null; reject_reason: string | null;
  substitute_profile?: { full_name: string } | null;
  coach_leave_classes?: { class: { name: string } | null }[];
}

function LeaveHistory({ back, coachId }: { back: () => void; coachId: string }) {
  const supabase = createClient();
  const [leaves, setLeaves] = useState<LeaveHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) { setLoading(false); return; }
    supabase.from("coach_leaves")
      .select("id, type, date_from, date_to, status, reason, reject_reason, substitute_profile:profiles!coach_leaves_substitute_id_fkey(full_name), coach_leave_classes(class:classes(name))")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { if (data) setLeaves(data as unknown as LeaveHistoryRow[]); setLoading(false); });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusLabel: Record<string, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };
  const statusKind: Record<string, "pending" | "approved" | "rejected"> = { pending: "pending", approved: "approved", rejected: "rejected" };
  const typeLabel: Record<string, string> = { izin: "Izin", sakit: "Sakit", lainnya: "Lainnya" };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={back} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> Kembali
      </button>
      <Card>
        <SectionTitle sub="Semua pengajuan izin Anda">Riwayat Izin</SectionTitle>
        {loading ? (
          <div className="text-ink-mute text-sm">Memuat…</div>
        ) : leaves.length === 0 ? (
          <p className="text-ink-mute text-sm">Belum ada pengajuan izin.</p>
        ) : (
          <div className="space-y-3">
            {leaves.map((l) => {
              const classes = l.coach_leave_classes?.map(lc => lc.class?.name).filter(Boolean) ?? [];
              return (
                <div key={l.id} className="rounded-xl border border-line p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink">{typeLabel[l.type] ?? l.type}</span>
                      {classes.length > 0 && <span className="text-xs text-ink-mute">· {classes.join(", ")}</span>}
                    </div>
                    <Status kind={statusKind[l.status] ?? "pending"}>{statusLabel[l.status] ?? l.status}</Status>
                  </div>
                  <div className="text-xs text-ink-mute font-mono">
                    {fmtDate(l.date_from)}{l.date_from !== l.date_to ? ` — ${fmtDate(l.date_to)}` : ""}
                  </div>
                  {l.reason && <p className="text-xs text-ink-soft">{l.reason}</p>}
                  {l.substitute_profile && (
                    <div className="text-xs text-ink-mute">Pengganti: <span className="font-semibold text-ink">{l.substitute_profile.full_name}</span></div>
                  )}
                  {l.status === "rejected" && l.reject_reason && (
                    <div className="rounded-lg bg-danger-50 border border-danger-200 px-3 py-2">
                      <div className="text-xs font-bold text-danger-700 mb-0.5">Alasan penolakan</div>
                      <p className="text-xs text-danger-600">{l.reject_reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Leave form ─────────────────────────────────────────────────────────────────

function LeaveForm({ back, coachId, branchId, classes }: { back: () => void; coachId: string; branchId?: string; classes: ClassRow[] }) {
  const toast = useToast();
  const supabase = createClient();
  const [type, setType] = useState("sakit");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  const [reason, setReason] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [coachList, setCoachList] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    supabase.from("profiles")
      .select("id, full_name")
      .eq("branch_id", branchId)
      .eq("role", "coach")
      .neq("id", coachId)
      .order("full_name")
      .then(({ data }) => { if (data) setCoachList(data as { id: string; full_name: string }[]); });
  }, [branchId, coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!startDate || !endDate) return toast.error("Tanggal mulai dan selesai wajib diisi");
    setSaving(true);
    const { data: leave, error } = await supabase.from("coach_leaves").insert({
      coach_id: coachId,
      type: type as "izin" | "sakit" | "lainnya", date_from: startDate, date_to: endDate, reason: reason || null, status: "pending" as const,
      substitute_id: substituteId || null,
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
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {(c.schedule_days ?? []).join(", ")} {c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</option>)}
            </Select>
          </Field>
          {coachList.length > 0 && (
            <Field label="Coach pengganti (opsional)">
              <Select value={substituteId} onChange={e => setSubstituteId(e.target.value)}>
                <option value="">— tidak ada pengganti —</option>
                {coachList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
          )}
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
          async (decodedText: string) => {
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

function CoachHome({ setOverlay, coachId, profile, classes, holidayClassIds }: {
  setOverlay: (v: string) => void;
  coachId: string; branchId?: string;
  profile: ProfileData | null;
  classes: ClassRow[];
  holidayClassIds: Set<string>;
}) {
  const supabase = createClient();
  const [monthStats, setMonthStats] = useState({ present: 0, leave: 0, sub: 0 });
  const [subClasses, setSubClasses] = useState<{ classId: string; className: string; originalCoach: string }[]>([]);
  // Class IDs the coach is on leave for today (clock-in blocked)
  const [leaveClassIds, setLeaveClassIds] = useState<Set<string>>(new Set());

   
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

    // Load own approved leaves for today → block clock-in on those classes
    supabase.from("coach_leaves")
      .select("coach_leave_classes(class_id)")
      .eq("coach_id", coachId)
      .eq("status", "approved")
      .lte("date_from", today)
      .gte("date_to", today)
      .then(({ data }) => {
        if (!data) return;
        const ids = new Set<string>();
        (data as unknown as { coach_leave_classes: { class_id: string }[] }[]).forEach(l =>
          l.coach_leave_classes.forEach(lc => ids.add(lc.class_id))
        );
        setLeaveClassIds(ids);
      });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps
   

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const todayClasses = classes.filter(c => (c.schedule_days ?? []).includes(todayName));

  return (
    <div className="space-y-5">
      <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
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
      </div>

      <div>
        <SectionTitle sub={fmtDateLong(new Date())}>Kelas hari ini</SectionTitle>
        {todayClasses.length === 0 && subClasses.length === 0 ? (
          <Card><p className="text-ink-mute text-sm">Tidak ada kelas hari ini.</p></Card>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((c) => {
              const isHoliday = holidayClassIds.has(c.id);
              const isOnLeave = leaveClassIds.has(c.id);
              const inWindow = !isHoliday && !isOnLeave && isInClockInWindow(c.time_start, c.time_end);
              return (
                <Card key={c.id} className={isHoliday || isOnLeave ? "opacity-60" : ""}>
                  <div className="flex items-start gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isHoliday ? "bg-warn-50 text-warn-500" : isOnLeave ? "bg-danger-50 text-danger-400" : "bg-wave-50 text-wave-600"}`}>
                      <Icon name={isHoliday ? "flag" : isOnLeave ? "clipboard" : "swim"} className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{c.name}</div>
                        {isHoliday && <Status kind="holiday">Libur</Status>}
                        {isOnLeave && <Status kind="inactive">Izin Hari Ini</Status>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5 font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""} · {c.enrolled}/{c.capacity} member</div>
                      {!isHoliday && !isOnLeave && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {inWindow ? (
                            <Btn variant="primary" size="sm" icon="camera" onClick={() => setOverlay(`clockin:${c.id}`)}>Clock-In</Btn>
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
                          <Btn variant="primary" size="sm" icon="camera" onClick={() => setOverlay(`clockin:${s.classId}`)}>Clock-In</Btn>
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
          <button onClick={() => setOverlay("leave-history")} className="p-4 rounded-xl bg-paper-tint hover:bg-ocean-50 border border-line text-left">
            <span className="w-9 h-9 rounded-lg bg-white text-wave-600 flex items-center justify-center mb-2"><Icon name="calendar" className="w-4 h-4" /></span>
            <div className="font-bold text-sm text-ink">Riwayat Izin</div>
            <div className="text-xs text-ink-mute mt-0.5">Status pengajuan izin</div>
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── Absensi ────────────────────────────────────────────────────────────────────

function CoachAbsensi({ setOverlay, coachId, classes, holidayClassIds }: {
  setOverlay: (v: string) => void;
  coachId: string; branchId?: string; classes: ClassRow[]; holidayClassIds: Set<string>;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openManual, setOpenManual] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [manualClassId, setManualClassId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualSessionDates, setManualSessionDates] = useState<{ value: string; label: string }[]>([]);
  const [memberAtt, setMemberAtt] = useState<MemberAttRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [attStatus, setAttStatus] = useState<Record<string, string>>({});
  const [memberAttHistory, setMemberAttHistory] = useState<{ id: string; session_date: string; class_name: string; total: number; hadir: number }[]>([]);

  // Private session recording
  const [openPrivate, setOpenPrivate] = useState(false);
  const [privateClassId, setPrivateClassId] = useState("");
  const [privateDate, setPrivateDate] = useState(new Date().toISOString().split("T")[0]);
  const [privateNote, setPrivateNote] = useState("");
  const [savingPrivate, setSavingPrivate] = useState(false);
  const privateClasses = classes.filter(c => c.class_type === "private");

  const loadMemberAttHistory = useCallback(async () => {
    if (!coachId) return;
    // Get distinct (class_id, session_date) combos where coach manually entered attendance
    const { data } = await supabase.from("member_attendances")
      .select("id, session_date, method, status, class_id, class:classes(name)")
      .eq("method", "manual")
      .in("class_id",
        (await supabase.from("class_coaches").select("class_id").eq("coach_id", coachId).then(r => r.data?.map(x => x.class_id) ?? []))
      )
      .order("session_date", { ascending: false })
      .limit(100);
    if (!data) return;
    // Group by (class_id, session_date)
    const grouped = new Map<string, { id: string; session_date: string; class_name: string; total: number; hadir: number }>();
    for (const row of data) {
      const cls = (row as unknown as { class: { name: string } | null }).class;
      const key = `${row.class_id}__${row.session_date}`;
      if (!grouped.has(key)) grouped.set(key, { id: key, session_date: row.session_date, class_name: cls?.name ?? "—", total: 0, hadir: 0 });
      const g = grouped.get(key)!;
      g.total++;
      if (row.status === "hadir") g.hadir++;
    }
    setMemberAttHistory([...grouped.values()].sort((a, b) => b.session_date.localeCompare(a.session_date)).slice(0, 10));
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    supabase.from("coach_attendances")
      .select("id, session_date, clock_in_time, distance_meters, is_manual, manual_note, status, class:classes(name), manual_by_profile:profiles!coach_attendances_manual_by_fkey(full_name)")
      .eq("coach_id", coachId).order("session_date", { ascending: false }).order("clock_in_time", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHistory(data as unknown as AttendanceRow[]); setLoading(false); });
    loadMemberAttHistory();
  }, [coachId, loadMemberAttHistory]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const onManualClassChange = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    const dates: { value: string; label: string }[] = [];
    if (cls?.schedule_days?.length) {
      const DAY_MAP: Record<string, number> = { Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6 };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let daysBack = 0; daysBack <= 56; daysBack++) {
        const d = new Date(today); d.setDate(today.getDate() - daysBack);
        if (cls.schedule_days.some(sd => DAY_MAP[sd] === d.getDay())) {
          const iso = d.toISOString().split("T")[0];
          dates.push({ value: iso, label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) });
        }
      }
    }
    setManualSessionDates(dates);
    const defaultDate = dates[0]?.value ?? new Date().toISOString().split("T")[0];
    setManualClassId(classId);
    setManualDate(defaultDate);
    setMemberAtt([]);
    setAttStatus({});
  };

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

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (manualClassId && manualDate) loadMembers(manualClassId, manualDate);
  }, [manualClassId, manualDate, loadMembers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveManualAtt = async () => {
    if (!manualClassId || !manualDate) return toast.error("Kelas dan tanggal wajib diisi");
    if (memberAtt.length === 0) return toast.error("Tidak ada member di kelas ini");
    setSaving(true);
    const rows = memberAtt.map(m => ({ class_id: manualClassId, member_id: m.member_id, session_date: manualDate, status: (attStatus[m.member_id] ?? "hadir") as "hadir" | "izin" | "sakit" | "tidak_hadir", method: "manual" as const }));
    const { error } = await supabase.from("member_attendances").upsert(rows, { onConflict: "class_id,member_id,session_date" });
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    const hadirCount = rows.filter(r => r.status === "hadir").length;
    toast.success("Absensi member disimpan", `${hadirCount} hadir dari ${rows.length} member`);
    setOpenManual(false);
    setManualClassId(""); setManualDate(""); setManualSessionDates([]); setMemberAtt([]); setAttStatus({});
    loadMemberAttHistory();
  };

  const savePrivateSession = async () => {
    if (!privateClassId || !privateDate) return toast.error("Kelas dan tanggal wajib diisi");
    setSavingPrivate(true);
    // Get member_id for this private class (capacity=1, so 1 member)
    const { data: mcData } = await supabase.from("member_classes").select("member_id").eq("class_id", privateClassId).limit(1);
    const memberId = mcData?.[0]?.member_id;
    if (!memberId) { setSavingPrivate(false); return toast.error("Tidak ada member di kelas ini"); }
    // Check for duplicate (same class + date)
    const { data: dupCheck } = await supabase.from("member_attendances").select("id").eq("class_id", privateClassId).eq("member_id", memberId).eq("session_date", privateDate).limit(1);
    if (dupCheck && dupCheck.length > 0) { setSavingPrivate(false); return toast.error("Sesi di tanggal ini sudah dicatat"); }
    // Insert attendance
    const { error: attErr } = await supabase.from("member_attendances").insert({ class_id: privateClassId, member_id: memberId, session_date: privateDate, status: "hadir", method: "manual" });
    if (attErr) { setSavingPrivate(false); return toast.error("Gagal mencatat sesi", attErr.message); }
    // Decrement remaining_sessions
    const { data: memberRow } = await supabase.from("members").select("remaining_sessions").eq("id", memberId).single();
    const remaining = memberRow?.remaining_sessions ?? 0;
    await supabase.from("members").update({ remaining_sessions: Math.max(0, remaining - 1) }).eq("id", memberId);
    setSavingPrivate(false);
    toast.success("Sesi private dicatat", `Sisa sesi: ${Math.max(0, remaining - 1)}`);
    setOpenPrivate(false);
    setPrivateClassId(""); setPrivateDate(new Date().toISOString().split("T")[0]); setPrivateNote("");
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
                    <div className="text-xs text-ink-mute font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
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

      <div className={`grid gap-3 ${privateClasses.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
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
        {privateClasses.length > 0 && (
          <Card className="bg-wave-50 border-wave-100">
            <Icon name="sparkle" className="w-8 h-8 text-wave-600 mb-2" />
            <div className="font-display font-bold text-ink">Sesi Private</div>
            <p className="text-xs text-ink-mute mt-1">Catat sesi 1-on-1, kurangi sisa sesi</p>
            <Btn variant="soft" size="sm" className="mt-3 w-full" onClick={() => setOpenPrivate(true)}>Catat sesi</Btn>
          </Card>
        )}
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

      {memberAttHistory.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub="Absensi member yang Anda input manual">History Absensi Member</SectionTitle></div>
          <div className="divide-y divide-line">
            {memberAttHistory.map((h) => (
              <div key={h.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint">
                <span className="w-10 h-10 rounded-xl bg-wave-50 text-wave-600 flex items-center justify-center shrink-0">
                  <Icon name="users" className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{h.class_name}</div>
                  <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-ok-600 text-sm">{h.hadir}/{h.total}</div>
                  <div className="text-[10px] text-ink-faint">hadir</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={openManual} onClose={() => { setOpenManual(false); setManualClassId(""); setManualDate(""); setManualSessionDates([]); setMemberAtt([]); setAttStatus({}); }} title="Absensi Manual Member"
        footer={<><Btn variant="ghost" onClick={() => { setOpenManual(false); setManualClassId(""); setManualDate(""); setManualSessionDates([]); setMemberAtt([]); setAttStatus({}); }}>Batal</Btn><Btn variant="primary" onClick={saveManualAtt} disabled={saving}>{saving ? "Menyimpan…" : "Submit"}</Btn></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kelas" required>
              <Select value={manualClassId} onChange={e => onManualClassChange(e.target.value)}>
                <option value="">Pilih kelas…</option>
                {classes.filter(c => c.class_type !== "private").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Sesi / tanggal" required>
              <Select value={manualDate} onChange={e => setManualDate(e.target.value)} disabled={!manualClassId}>
                <option value="">{manualClassId ? "Pilih sesi…" : "Pilih kelas dulu"}</option>
                {manualSessionDates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
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

      <Modal open={openPrivate} onClose={() => setOpenPrivate(false)} title="Catat Sesi Private"
        footer={<><Btn variant="ghost" onClick={() => setOpenPrivate(false)}>Batal</Btn><Btn variant="primary" onClick={savePrivateSession} disabled={savingPrivate}>{savingPrivate ? "Menyimpan…" : "Catat Sesi"}</Btn></>}>
        <div className="space-y-4">
          <div className="bg-wave-50 border border-wave-100 rounded-xl p-3 text-sm text-wave-800 flex gap-2">
            <Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-wave-500" />
            <span>Mencatat sesi ini akan otomatis mengurangi sisa sesi member sebanyak 1.</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kelas private" required>
              <Select value={privateClassId} onChange={e => setPrivateClassId(e.target.value)}>
                <option value="">Pilih kelas…</option>
                {privateClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Tanggal sesi" required><Input type="date" value={privateDate} onChange={e => setPrivateDate(e.target.value)} max={new Date().toISOString().split("T")[0]} /></Field>
          </div>
          <Field label="Catatan" hint="Opsional — materi, kondisi member, dll.">
            <Textarea rows={2} value={privateNote} onChange={e => setPrivateNote(e.target.value)} placeholder="Mis. Latihan gaya dada, progress baik." />
          </Field>
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

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
                <div className="text-xs text-ocean-700 font-semibold mt-1.5 font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
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

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = (id: string) => { const s = new Set(selected); if (s.has(id)) { s.delete(id); } else { s.add(id); } setSelected(s); };
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
      <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">Generate invoice</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">{new Date(monthFilter + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h2>
          <p className="text-white/80 text-sm mt-1">Pilih sesi yang ingin dimasukkan ke invoice.</p>
        </div>
      </div>
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
    if (!branchId || !coachId) return;
    (async () => {
      // 1. Find active period
      const { data: periodData } = await supabase
        .from("rapor_periods").select("id, label, date_to").eq("branch_id", branchId).eq("is_open", true).single();
      if (!periodData) { setLoading(false); return; }
      setPeriod(periodData as { id: string; label: string; date_to: string });

      // 2. Get all members in coach's classes
      const { data: classCoachRows } = await supabase
        .from("class_coaches").select("class_id").eq("coach_id", coachId);
      const myClassIds = (classCoachRows ?? []).map(r => r.class_id);

      if (myClassIds.length === 0) { setLoading(false); return; }

      // Get members enrolled in each of those classes
      const { data: mcRows } = await supabase
        .from("member_classes").select("member_id, class_id").in("class_id", myClassIds);
      const memberClassPairs = (mcRows ?? []) as { member_id: string; class_id: string }[];

      // 3. Insert stubs for any members without an entry yet
      if (memberClassPairs.length > 0) {
        // Fetch existing entry member_ids to avoid duplicates (no unique constraint in DB)
        const { data: existing } = await supabase
          .from("rapor_entries").select("member_id").eq("period_id", periodData.id).eq("coach_id", coachId);
        const existingMemberIds = new Set((existing ?? []).map(e => e.member_id));
        const newStubs = memberClassPairs
          .filter(mc => !existingMemberIds.has(mc.member_id))
          .map(mc => ({
            period_id: periodData.id,
            member_id: mc.member_id,
            class_id: mc.class_id,
            coach_id: coachId,
            locked: false,
          }));
        if (newStubs.length > 0) {
          await supabase.from("rapor_entries").insert(newStubs);
        }
      }

      // 4. Now fetch all entries for this coach + period
      const { data: e } = await supabase.from("rapor_entries")
        .select("id, member_id, class_id, locked, scores, notes, member:members(profile:profiles(full_name)), class:classes(name, class_criteria(id, label, kind, options, sort_order))")
        .eq("period_id", periodData.id).eq("coach_id", coachId);
      if (e) setEntries(e as unknown as RaporEntry[]);
      setLoading(false);
    })();
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
    const { error } = await supabase.from("rapor_entries")
      .update({ scores, notes, filled_at: new Date().toISOString(), locked: true })
      .eq("id", open.id);
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan rapor", error.message);
    toast.success("Rapor disimpan");
    setOpen(null);
    setEntries(prev => prev.map(e => e.id === open.id ? { ...e, locked: true, scores, notes } : e));
  };

  return (
    <div className="space-y-5">
      {period ? (
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-wave-500/30 blur-2xl" />
          <div className="relative">
            <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> Periode aktif</div>
            <div className="font-display font-bold text-2xl mt-0.5">{period.label}</div>
            <p className="text-white/80 text-sm mt-1">{entries.filter(e => e.locked).length}/{entries.length} member sudah diisi</p>
          </div>
        </div>
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

      <div>
        <SectionTitle sub="Ulasan member terhadap Anda">Ulasan Saya</SectionTitle>
        <CoachMyReviews coachId={coachId} />
      </div>
    </div>
  );
}

// ── Coach My Reviews ───────────────────────────────────────────────────────────

interface MyReviewRow {
  id: string; stars: number; message: string | null;
  created_at: string; member_name: string; period_label: string;
}

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, k) => (
        <Icon key={k} name="star" className={`w-3.5 h-3.5 ${k < stars ? "text-amber-400" : "text-line"}`} strokeWidth={1.5} fill={k < stars ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function CoachMyReviews({ coachId }: { coachId: string }) {
  const supabase = createClient();
  const [reviews, setReviews] = useState<MyReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("member_reviews")
        .select("id, stars, message, created_at, member:members!member_reviews_member_id_fkey(profile:profiles(full_name)), rapor:rapor_entries!member_reviews_rapor_id_fkey(rapor_periods(label))")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });
      if (!data) { setLoading(false); return; }
      setReviews((data as unknown as {
        id: string; stars: number; message: string | null; created_at: string;
        member: { profile: { full_name: string } | null } | null;
        rapor: { rapor_periods: { label: string } | null } | null;
      }[]).map(r => ({
        id: r.id, stars: r.stars, message: r.message, created_at: r.created_at,
        member_name: r.member?.profile?.full_name ?? "—",
        period_label: r.rapor?.rapor_periods?.label ?? "—",
      })));
      setLoading(false);
    })();
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;

  if (loading) return <div className="text-ink-mute text-sm py-3">Memuat ulasan…</div>;

  return (
    <div className="space-y-3">
      {avg !== null && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="text-center shrink-0">
            <div className="text-3xl font-bold text-amber-600">{avg.toFixed(1)}</div>
            <StarDisplay stars={Math.round(avg)} />
            <div className="text-xs text-ink-mute mt-1">{reviews.length} ulasan</div>
          </div>
          <div className="flex-1 space-y-1">
            {[5,4,3,2,1].map(s => {
              const cnt = reviews.filter(r => r.stars === s).length;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-ink-mute w-2">{s}</span>
                  <Icon name="star" className="w-3 h-3 text-amber-400 shrink-0" strokeWidth={1.5} fill="currentColor" />
                  <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: reviews.length ? `${(cnt/reviews.length)*100}%` : "0%" }} />
                  </div>
                  <span className="text-xs text-ink-mute w-4 text-right">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {reviews.length === 0 && <p className="text-ink-mute text-sm text-center py-6">Belum ada ulasan dari member.</p>}
      <div className="space-y-2.5">
        {reviews.map(r => (
          <div key={r.id} className="bg-white border border-line rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-semibold text-ink text-sm">{r.member_name}</div>
                <div className="text-xs text-ink-mute">{r.period_label}</div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StarDisplay stars={r.stars} />
                <span className="text-xs text-ink-faint">{fmtDate(r.created_at)}</span>
              </div>
            </div>
            {r.message && <p className="text-sm text-ink-soft bg-paper-tint rounded-xl px-3 py-2">{r.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────

function CoachProfile({ profile, onRefresh, onLogout }: { profile: ProfileData | null; onRefresh: () => void; onLogout: () => void }) {
  const supabase = createClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { upload, uploading } = useUpload();
  // Password
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  // Avatar
  const [photoView, setPhotoView] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  // Inline profile form
  const [profileForm, setProfileForm] = useState({
    nick_name: "", gender: "", birth_date: "", phone: "",
    specialization: "", bio: "", address: "",
    education_level: "", education_institution: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  // Bank modal
  const [openEditBank, setOpenEditBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", bank_account: "", bank_holder: "" });
  const [savingBank, setSavingBank] = useState(false);
  // Cert modal
  const [openAddCert, setOpenAddCert] = useState(false);
  const [editCertTarget, setEditCertTarget] = useState<{ id: string; title: string; issuer: string | null; valid_from: string | null; valid_until: string | null; photo_url: string | null; status: string; reject_reason: string | null } | null>(null);
  const [certForm, setCertForm] = useState({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [savingCert, setSavingCert] = useState(false);

  // Populate inline form when profile loads
  React.useEffect(() => {
    if (!profile) return;
    setProfileForm({
      nick_name: profile.nick_name ?? "",
      gender: profile.gender ?? "",
      birth_date: profile.birth_date ?? "",
      phone: profile.phone ?? "",
      specialization: profile.specialization ?? "",
      bio: profile.bio ?? "",
      address: profile.address ?? "",
      education_level: profile.education_level ?? "",
      education_institution: profile.education_institution ?? "",
    });
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setPhotoView(false);
  };

  const uploadAvatar = async () => {
    if (!pendingAvatarFile) return;
    const url = await upload.avatar(pendingAvatarFile);
    if (url) {
      toast.success("Foto profil diperbarui");
      setPendingAvatarFile(null);
      setAvatarPreview(null);
      onRefresh();
    }
  };

  const saveCert = async () => {
    if (!profile?.id) return toast.error("Profil belum dimuat, coba refresh");
    if (!certForm.title || !certForm.issued_at) return toast.error("Judul dan tanggal berlaku wajib diisi");
    setSavingCert(true);

    // 1. Insert cert row
    const { data: cert, error } = await supabase.from("certifications").insert({
      coach_id: profile.id, name: certForm.title, title: certForm.title,
      issuer: certForm.issuer || null,
      valid_from: certForm.issued_at || null,
      valid_until: certForm.no_expiry ? null : (certForm.expires_at || null),
      status: "pending",
    }).select("id").single();

    if (error) { setSavingCert(false); return toast.error("Gagal menambah sertifikasi", error.message); }

    // 2. Upload photo if provided — route handler already updates photo_url in DB
    if (cert && certFile) {
      try { await upload.cert(certFile, cert.id); } catch { /* non-fatal */ }
    }

    setSavingCert(false);
    toast.success("Sertifikasi ditambahkan", "Menunggu verifikasi admin");
    setOpenAddCert(false);
    setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false });
    setCertFile(null);
    onRefresh();
  };

  const openCertEdit = (s: { id: string; title: string; issuer: string | null; valid_from: string | null; valid_until: string | null; photo_url: string | null; status: string; reject_reason: string | null }) => {
    setEditCertTarget(s);
    setCertForm({ title: s.title, issuer: s.issuer ?? "", issued_at: s.valid_from ?? "", expires_at: s.valid_until ?? "", no_expiry: !s.valid_until });
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

  const resubmitCert = async (id: string) => {
    const { error } = await supabase.from("certifications")
      .update({ status: "pending", reject_reason: null })
      .eq("id", id);
    if (error) return toast.error("Gagal mengajukan ulang", error.message);
    toast.success("Sertifikasi diajukan ulang", "Menunggu verifikasi admin");
    onRefresh();
  };

  const saveCertEdit = async () => {
    if (!editCertTarget || !certForm.title || !certForm.issued_at) return toast.error("Judul dan tanggal wajib diisi");
    setSavingCert(true);
    const wasRejected = editCertTarget.status === "rejected";
    const { error } = await supabase.from("certifications").update({
      name: certForm.title, issuer: certForm.issuer || null,
      valid_from: certForm.issued_at || null,
      valid_until: certForm.no_expiry ? null : (certForm.expires_at || null),
      ...(wasRejected ? { status: "pending", reject_reason: null } : {}),
    }).eq("id", editCertTarget.id);
    if (!error && certFile) {
      try { await upload.cert(certFile, editCertTarget.id); } catch { /* non-fatal */ }
    }
    setSavingCert(false);
    if (error) return toast.error("Gagal memperbarui sertifikasi", error.message);
    toast.success("Sertifikasi diperbarui");
    setOpenAddCert(false);
    setEditCertTarget(null);
    onRefresh();
  };

  const saveProfileInfo = async () => {
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      nick_name: profileForm.nick_name || null,
      gender: profileForm.gender || null,
      birth_date: profileForm.birth_date || null,
      phone: profileForm.phone || null,
      specialization: profileForm.specialization || null,
      bio: profileForm.bio || null,
      address: profileForm.address || null,
      education_level: profileForm.education_level || null,
      education_institution: profileForm.education_institution || null,
    }).eq("id", profile?.id);
    setSavingProfile(false);
    if (error) return toast.error("Gagal menyimpan profil", error.message);
    toast.success("Profil diperbarui");
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

  return (
    <div className="space-y-5">
      {/* ── Avatar card ── */}
      <Card>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setPhotoView(true)} className="relative inline-block shrink-0 cursor-zoom-in group">
            <Avatar name={profile?.full_name ?? "C"} size={72} src={avatarPreview ?? profile?.avatar_url ?? undefined} />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-sm pointer-events-none">
              <Icon name="camera" className="w-3 h-3" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink leading-tight">{profile?.full_name ?? "—"}</div>
            {profile?.nick_name && <div className="text-sm text-ink-mute">({profile.nick_name})</div>}
            <div className="text-sm text-ocean-700 font-semibold mt-0.5">{profile?.specialization ?? "Coach"}</div>
          </div>
        </div>
        {pendingAvatarFile && (
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" size="sm" disabled={uploading} onClick={uploadAvatar}>{uploading ? "Mengupload…" : "Upload foto"}</Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setPendingAvatarFile(null); setAvatarPreview(null); }}>Batal</Btn>
          </div>
        )}
      </Card>

      {/* ── Inline Profile form ── */}
      <Card>
        <SectionTitle>Profil Saya</SectionTitle>
        <div className="mt-4 space-y-4">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">Data Pribadi</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nama panggilan" hint="Opsional"><Input value={profileForm.nick_name} onChange={e => setProfileForm(f => ({ ...f, nick_name: e.target.value }))} placeholder="Nama panggilan" /></Field>
            <Field label="Jenis kelamin">
              <Select value={profileForm.gender} onChange={e => setProfileForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Pilih…</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tanggal lahir" hint="Opsional"><Input type="date" value={profileForm.birth_date} onChange={e => setProfileForm(f => ({ ...f, birth_date: e.target.value }))} /></Field>
            <Field label="Nomor WhatsApp"><Input type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" /></Field>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-1">Email</div>
            <div className="text-sm font-semibold text-ink">{profile?.email ?? "—"}</div>
          </div>
          <Field label="Alamat" hint="Opsional"><Textarea rows={2} value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap" /></Field>

          <div className="pt-3 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Pendidikan (Opsional)</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Pendidikan terakhir">
                <Select value={profileForm.education_level} onChange={e => setProfileForm(f => ({ ...f, education_level: e.target.value }))}>
                  <option value="">Pilih…</option>
                  {["TK","SD","SMP","SMA","D1","D2","D3","S1/D4","S2","S3"].map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Nama instansi"><Input value={profileForm.education_institution} onChange={e => setProfileForm(f => ({ ...f, education_institution: e.target.value }))} placeholder="Mis. Universitas Indonesia" /></Field>
            </div>
          </div>

          <div className="pt-3 border-t border-line">
            <div className="text-xs font-bold text-ink-mute uppercase tracking-widest mb-3">Profil Pelatih</div>
            <div className="space-y-3">
              <Field label="Spesialisasi" hint="Opsional"><Input value={profileForm.specialization} onChange={e => setProfileForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Mis. Renang gaya bebas, anak-anak" /></Field>
              <Field label="Bio / Deskripsi" hint="Opsional"><Textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} placeholder="Ceritakan sedikit tentang Anda…" /></Field>
            </div>
          </div>

          <Btn variant="primary" size="md" onClick={saveProfileInfo} disabled={savingProfile}>{savingProfile ? "Menyimpan…" : "Simpan Profil"}</Btn>
        </div>
      </Card>

      {/* ── Bank info ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Informasi Rekening</SectionTitle>
          <Btn variant="ghost" size="sm" icon="edit" onClick={openBankEdit}>Edit</Btn>
        </div>
        {profile?.bank_name ? (
          <div className="text-sm font-semibold text-ink">{profile.bank_name} · <span className="font-mono">{profile.bank_account}</span> a/n {profile.bank_holder}</div>
        ) : (
          <div className="text-sm text-warn-600 font-semibold">Belum diisi — diperlukan untuk generate invoice</div>
        )}
      </Card>

      {/* ── Certifications ── */}
      <Card padded={false}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <SectionTitle sub="Perlu approve admin saat ditambahkan">Sertifikasi</SectionTitle>
          <Btn variant="soft" size="sm" icon="plus" onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false }); setCertFile(null); setEditCertTarget(null); setOpenAddCert(true); }}>Tambah</Btn>
        </div>
        <div className="divide-y divide-line">
          {(profile?.certifications ?? []).map((s) => (
            <div key={s.id} className="px-5 py-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.status === "approved" ? "bg-ok-50 text-ok-600" : s.status === "rejected" ? "bg-danger-50 text-danger-600" : "bg-warn-50 text-warn-600"}`}><Icon name="shield" className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{s.title}</div>
                  {s.valid_from && <div className="text-xs text-ink-mute font-mono">{s.valid_from}{s.valid_until ? ` – ${s.valid_until}` : " · Tidak kedaluwarsa"}</div>}
                </div>
                <Status kind={s.status}>{s.status === "approved" ? "Disetujui" : s.status === "rejected" ? "Ditolak" : "Menunggu"}</Status>
                <div className="flex items-center gap-1">
                  <button onClick={() => openCertEdit(s)} className="p-1.5 rounded hover:bg-paper-tint text-ink-mute hover:text-ink" title="Edit"><Icon name="edit" className="w-4 h-4" /></button>
                  <button onClick={() => deleteCert(s)} className="p-1.5 rounded hover:bg-danger-50 text-ink-mute hover:text-danger-600" title="Hapus"><Icon name="trash" className="w-4 h-4" /></button>
                </div>
              </div>
              {s.status === "rejected" && (
                <div className="space-y-2">
                  {s.reject_reason && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger-50 border border-danger-100">
                      <Icon name="warning" className="w-4 h-4 text-danger-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-danger-600 uppercase tracking-wide mb-0.5">Alasan Ditolak</div>
                        <div className="text-sm text-danger-700">{s.reject_reason}</div>
                      </div>
                    </div>
                  )}
                  <Btn variant="soft" size="sm" icon="refresh" onClick={() => resubmitCert(s.id)}>Ajukan Lagi</Btn>
                </div>
              )}
              {s.photo_url && (
                <a href={s.photo_url} target="_blank" rel="noreferrer" className="block">
                  <img src={s.photo_url} alt={s.title} className="w-full max-h-40 object-cover rounded-xl border border-line hover:opacity-90 transition-opacity" />
                </a>
              )}
            </div>
          ))}
          {(profile?.certifications?.length ?? 0) === 0 && <div className="px-5 py-4 text-sm text-ink-mute">Belum ada sertifikasi.</div>}
        </div>
      </Card>

      {/* ── Change password ── */}
      <Card>
        <SectionTitle>Ganti Password</SectionTitle>
        <div className="mt-4 space-y-3">
          <Field label="Password baru"><Input type="password" placeholder="Password baru" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></Field>
          <Field label="Konfirmasi"><Input type="password" placeholder="Ulangi password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></Field>
          <Btn variant="primary" size="md" onClick={changePassword} disabled={savingPwd}>{savingPwd ? "Menyimpan…" : "Simpan password baru"}</Btn>
        </div>
      </Card>

      {/* ── Cert modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setEditCertTarget(null); }} title={editCertTarget ? "Edit Sertifikasi" : "Tambah Sertifikasi"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setEditCertTarget(null); }}>Batal</Btn><Btn variant="primary" onClick={editCertTarget ? saveCertEdit : saveCert} disabled={savingCert}>{savingCert ? "Menyimpan…" : "Submit"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama sertifikasi" required><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder="Mis. Lifeguard ARC" /></Field>
          <Field label="Penerbit"><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder="Mis. PMI / FINA" /></Field>
          <Field label="Berlaku dari" required><Input type="date" value={certForm.issued_at} onChange={e => setCertForm(f => ({ ...f, issued_at: e.target.value }))} /></Field>
          <Field label="Berlaku sampai"><Input type="date" value={certForm.expires_at} disabled={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, expires_at: e.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, no_expiry: e.target.checked, expires_at: "" }))} className="rounded" />
            Tidak ada kedaluwarsa
          </label>
          <div>
            <div className="text-sm font-semibold text-ink mb-1.5">Foto sertifikat <span className="text-ink-faint font-normal text-xs">(opsional, bantu proses verifikasi)</span></div>
            {editCertTarget?.photo_url && !certFile && (
              <img src={editCertTarget.photo_url} alt="Foto saat ini" className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            {certFile && (
              <img src={URL.createObjectURL(certFile)} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper-tint hover:bg-white hover:border-ocean-400 transition-colors text-sm font-semibold text-ink-soft group-hover:text-ink">
                <Icon name="camera" className="w-4 h-4" />
                {certFile ? "Ganti foto" : editCertTarget?.photo_url ? "Ganti foto" : "Pilih foto"}
              </span>
              {certFile && <span className="text-sm text-ink-mute truncate max-w-[160px]">{certFile.name}</span>}
              <input type="file" accept="image/*" className="sr-only" onChange={e => setCertFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
      </Modal>

      {/* ── Bank modal ── */}
      <Modal open={openEditBank} onClose={() => setOpenEditBank(false)} title="Edit Informasi Rekening" size="sm"
        footer={<><Btn variant="ghost" onClick={() => setOpenEditBank(false)}>Batal</Btn><Btn variant="primary" onClick={saveBank} disabled={savingBank}>{savingBank ? "Menyimpan…" : "Simpan"}</Btn></>}>
        <div className="space-y-4">
          <Field label="Nama bank" required><Input value={bankForm.bank_name} onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Mis. BCA, BRI, Mandiri" /></Field>
          <Field label="Nomor rekening" required><Input value={bankForm.bank_account} onChange={e => setBankForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Nomor rekening" /></Field>
          <Field label="Atas nama" required><Input value={bankForm.bank_holder} onChange={e => setBankForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Nama pemilik rekening" /></Field>
        </div>
      </Modal>

      <Card>
        <button onClick={onLogout} className="w-full flex items-center gap-3 py-1 text-left group">
          <span className="w-9 h-9 rounded-xl bg-danger-50 text-danger-500 flex items-center justify-center group-hover:bg-danger-100 transition-colors">
            <Icon name="logout" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-danger-600 group-hover:text-danger-700">Keluar dari akun</span>
        </button>
      </Card>

      {photoView && (
        <PhotoLightbox
          src={avatarPreview ?? profile?.avatar_url ?? null}
          name={profile?.full_name ?? "C"}
          onClose={() => setPhotoView(false)}
          onChangePick={handleAvatarPick}
          uploading={uploading}
        />
      )}
    </div>
  );
}

function LockedNotice({ feature, reason }: { feature: string; reason: string }) {
  return (
    <Card className="!p-8 text-center border-dashed border-2">
      <Icon name="lock" className="w-8 h-8 text-ink-faint mx-auto mb-3" />
      <div className="font-display font-bold text-ink">{feature} tidak tersedia</div>
      <p className="text-sm text-ink-mute mt-1">{reason}</p>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CoachPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState<TabId>("home");
  const [overlay, setOverlay] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, is_profile_complete, suspend_until, suspend_reason")
      .eq("id", userId).single();
    if (error) console.error("[CoachPage] loadProfile error:", error);
    // Load certifications separately to avoid FK join ambiguity errors
    const { data: certs } = await supabase.from("certifications")
      .select("id, title, issuer, valid_from, valid_until, photo_url, status, reject_reason")
      .eq("coach_id", userId);
    if (data) {
      const combined = { ...data, certifications: certs ?? [] };
      setProfile(combined as unknown as ProfileData);
    }
    return data ? { ...data, certifications: certs ?? [] } as unknown as ProfileData : null;
  }, [supabase]);

  const loadClasses = useCallback(async (profileId: string) => {
    const { data } = await supabase.from("class_coaches").select("class:classes(id, name, schedule_days, time_start, time_end, capacity, enrolled, goals, class_type, member_classes(member:members(id, profile:profiles(full_name, birth_date, phone))))").eq("coach_id", profileId);
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

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

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
  /* eslint-disable react-hooks/set-state-in-effect -- timer-driven countdown */
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
  }, [isSuspended, profile?.suspend_until]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
  const lockReason = isSuspended ? "Akun Anda sedang disuspend." : "Lengkapi profil Anda terlebih dahulu.";

  const clockinClassId = overlay?.startsWith("clockin:") ? overlay.slice(8) : null;
  const content = (overlay === "clockin" || overlay?.startsWith("clockin:"))
    ? (locked ? <LockedNotice feature="Clock-In" reason={lockReason} /> : <ClockInFlow back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} preselectedClassId={clockinClassId ?? undefined} />)
    : overlay === "leave"
    ? <LeaveForm back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} />
    : overlay === "leave-history"
    ? <LeaveHistory back={() => setOverlay(null)} coachId={coachId} />
    : {
        home:    <>{SuspendBanner}{IncompleteBanner}<CoachHome setOverlay={setOverlay} coachId={coachId} branchId={branchId} profile={profile} classes={classes} holidayClassIds={holidayClassIds} /></>,
        absen:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Absensi" reason={lockReason} /> : <CoachAbsensi setOverlay={setOverlay} coachId={coachId} branchId={branchId} classes={classes} holidayClassIds={holidayClassIds} />}</>,
        kelas:   <CoachKelas classes={classes} coachId={coachId} />,
        invoice: <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Invoice" reason={lockReason} /> : <CoachInvoice coachId={coachId} branchId={branchId} profile={profile} />}</>,
        rapor:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Rapor" reason={lockReason} /> : <CoachRapor coachId={coachId} branchId={branchId} />}</>,
        profile: <CoachProfile profile={profile} onRefresh={() => user && loadProfile(user.id)} onLogout={logout} />,
      }[active];

  return (
    <>
      <Shell active={active} onNav={(id) => { setOverlay(null); setActive(id); }} title={overlay ? "" : title} sub={overlay ? "" : sub} user={user} avatarUrl={profile?.avatar_url}>
        {content}
      </Shell>
    </>
  );
}
