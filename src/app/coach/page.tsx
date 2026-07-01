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


type TabId = "home" | "absen" | "kelas" | "invoice" | "rapor" | "payslip" | "profile";

const NAV_ITEMS: MobileNavItem[] = [
  { id: "home",    label: "Home",      short: "Home",    icon: "home"    },
  { id: "absen",   label: "Absensi",   short: "Absen",   icon: "check"   },
  { id: "kelas",   label: "Kelas",     short: "Kelas",   icon: "swim"    },
  { id: "invoice", label: "Invoice",   short: "Invoice", icon: "invoice" },
  { id: "rapor",   label: "Rapor",     short: "Rapor",   icon: "book"    },
  { id: "payslip", label: "Slip Gaji", short: "Slip",    icon: "wallet"  },
  { id: "profile", label: "Profile",   short: "Saya",    icon: "user"    },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface CoachSpreadsheetRow {
  coach_id: string;
  spreadsheet_url: string;
  updated_at: string;
  coach?: { full_name: string } | null;
}

interface ClassRow {
  id: string; name: string; schedule_days: string[];
  time_start: string; time_end: string;
  capacity: number; enrolled: number;
  goals: string | null; description: string | null;
  class_type?: string;
  spreadsheet_filled?: boolean;
  spreadsheet_url?: string | null;
  branch?: { name: string; city: string; address: string | null } | null;
  member_classes?: { member: { id: string; profile: { full_name: string; birth_date: string | null; phone: string | null; gender: string | null; address: string | null; health_notes: string | null } | null } | null }[];
  coach_spreadsheets?: CoachSpreadsheetRow[];
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
  id: string; session_date: string; class_id: string; rate_per_session: number;
  rate_set: boolean;
  class?: { name: string } | null;
}

interface PastInvoice {
  id: string; invoice_number: string; period_label: string; total_amount: number; status: string;
  bank_info: string | null;
  coach_invoice_items?: { class_id: string; session_count: number; rate: number; class?: { name: string } | null }[];
}

interface RaporEntry {
  id: string; member_id: string; class_id: string; locked: boolean;
  personality?: string | null;
  motivation?: string | null;
  learning_achievements?: string | null;
  member?: { profile: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

interface BestTimeRow {
  id: string; stroke: string; distance: number; time_seconds: number;
}

const STROKES = ["freestyle", "backstroke", "breaststroke", "butterfly", "IM"] as const;
const DISTANCES = [25, 50, 100] as const;
type BtKey = `${typeof STROKES[number]}_${typeof DISTANCES[number]}`;

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

function Shell({ children, active, onNav, title, sub, user, avatarUrl, branches, activeBranchId, onBranchChange }: {
  children: React.ReactNode;
  active: TabId; onNav: (id: TabId) => void;
  title: string; sub: string; user: User | null; avatarUrl?: string | null;
  branches?: { branch_id: string; name: string }[];
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
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
          {/* Branch selector — only shown when coach has multiple branches */}
          {branches && branches.length > 1 && onBranchChange && (
            <select
              value={activeBranchId}
              onChange={e => onBranchChange(e.target.value)}
              className="text-xs font-semibold text-ocean-700 bg-ocean-50 border border-ocean-200 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ocean-400 max-w-[120px] truncate"
            >
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
              ))}
            </select>
          )}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((it) => (
              <button key={it.id} onClick={() => onNav(it.id as TabId)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${active === it.id ? "bg-ocean-50 text-ocean-700" : "text-ink-soft hover:bg-paper-tint"}`}>
                <Icon name={it.icon ?? ""} className="w-4 h-4" /> {it.label}
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

/** Haversine formula — returns distance in meters */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function ClockInFlow({ back, coachId, branchId, classes, preselectedClassId, onSuccess }: {
  back: () => void;
  coachId: string; branchId: string;
  classes: ClassRow[];
  preselectedClassId?: string;
  onSuccess?: (classId: string) => void;
}) {
  const toast = useToast();
  const { upload, uploading } = useUpload();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [classId, setClassId] = useState(preselectedClassId ?? classes[0]?.id ?? "");
  const [gpsStatus, setGpsStatus] = useState<"checking" | "ok" | "error">("checking");
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [branchCoords, setBranchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load branch coordinates
  useEffect(() => {
    supabase.from("branches").select("lat, lng").eq("id", branchId).single()
      .then(({ data }) => { if (data?.lat && data?.lng) setBranchCoords({ lat: data.lat, lng: data.lng }); });
  }, [branchId, supabase]);

  // Get GPS
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords(pos.coords); setGpsStatus("ok"); },
      () => setGpsStatus("error"),
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // Compute distance whenever both coords are available
  /* eslint-disable react-hooks/set-state-in-effect -- derived state from GPS coords */
  useEffect(() => {
    if (coords && branchCoords) {
      setDistanceMeters(haversineMeters(coords.latitude, coords.longitude, branchCoords.lat, branchCoords.lng));
    }
  }, [coords, branchCoords]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setStep(2); }
  };

  const submit = async () => {
    if (!classId) return toast.error("Pilih kelas terlebih dahulu");
    setSubmitting(true);
    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().slice(0, 8);

    // Determine late status: coach late if > 15 minutes after class start
    const selectedClass = classes.find(c => c.id === classId);
    const lateMinutes = selectedClass?.time_start ? minutesLate(nowTime, selectedClass.time_start) : 0;
    const coachStatus: "present" | "late" = lateMinutes > 15 ? "late" : "present";

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
      status: coachStatus, is_manual: false,
      selfie_url: selfieUrl,
      distance_meters: distanceMeters,
    });

    setSubmitting(false);
    if (error) { toast.error("Gagal menyimpan absensi", error.message); return; }
    if (coachStatus === "late") {
      toast.error("Absensi tercatat — Telat", `Anda clock-in ${lateMinutes} menit setelah kelas dimulai`);
    } else {
      toast.success("Absensi Berhasil!", "Data tersimpan ke history & admin panel");
    }
    onSuccess?.(classId);
    setStep(3);
  };

  const distLabel = distanceMeters != null
    ? distanceMeters < 1000
      ? `${distanceMeters} m dari cabang`
      : `${(distanceMeters / 1000).toFixed(1)} km dari cabang`
    : branchCoords == null
      ? "Koordinat cabang belum diset"
      : "Menghitung jarak…";

  const distColor = distanceMeters == null ? "text-ink-mute"
    : distanceMeters <= 500 ? "text-ok-600"
    : distanceMeters <= 2000 ? "text-warn-600"
    : "text-danger-600";

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
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-ink-faint font-bold uppercase tracking-widest mb-0.5">GPS</div>
                <div className={`font-semibold ${gpsStatus === "ok" ? "text-ok-600" : gpsStatus === "error" ? "text-danger-500" : "text-warn-600"}`}>
                  {gpsStatus === "ok" ? "✓ Terdeteksi" : gpsStatus === "error" ? "✗ Gagal" : "Mendeteksi…"}
                </div>
              </div>
              <div>
                <div className="text-ink-faint font-bold uppercase tracking-widest mb-0.5">Jarak ke Cabang</div>
                <div className={`font-semibold ${distColor}`}>{distLabel}</div>
              </div>
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
            // eslint-disable-next-line @next/next/no-img-element -- blob URL from camera capture
            <img src={URL.createObjectURL(photoFile)} alt="selfie preview" className="w-full aspect-square object-cover rounded-2xl" />
          )}
          <Card className="!p-3 mt-3 bg-paper-tint space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Icon name="pin" className="w-4 h-4 text-ocean-600 shrink-0" />
              <span className={`font-semibold ${distColor}`}>{distLabel}</span>
              <Status kind={gpsStatus === "ok" ? "active" : "inactive"} className="ml-auto">{gpsStatus === "ok" ? "GPS OK" : "No GPS"}</Status>
            </div>
            {coords && (
              <div className="text-[11px] text-ink-faint font-mono">
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </div>
            )}
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
          {distanceMeters != null && (
            <p className={`text-sm font-semibold mt-1 ${distColor}`}>{distLabel}</p>
          )}
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
  coach_leave_classes?: { class: { name: string } | null; substitute: { full_name: string } | null }[];
}

function LeaveHistory({ back, coachId }: { back: () => void; coachId: string }) {
  const supabase = createClient();
  const [leaves, setLeaves] = useState<LeaveHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!coachId) { setLoading(false); return; }
    supabase.from("coach_leaves")
      .select("id, type, date_from, date_to, status, reason, reject_reason, substitute_profile:profiles!coach_leaves_substitute_id_fkey(full_name), coach_leave_classes(class:classes(name), substitute:profiles!coach_leave_classes_substitute_id_fkey(full_name))")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { if (data) setLeaves(data as unknown as LeaveHistoryRow[]); setLoading(false); });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

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
              const hasPerClassSub = l.coach_leave_classes?.some(lc => lc.substitute?.full_name);
              return (
                <div key={l.id} className="rounded-xl border border-line p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-ink">{typeLabel[l.type] ?? l.type}</span>
                    <Status kind={statusKind[l.status] ?? "pending"}>{statusLabel[l.status] ?? l.status}</Status>
                  </div>
                  <div className="text-xs text-ink-mute font-mono">
                    {fmtDate(l.date_from)}{l.date_from !== l.date_to ? ` — ${fmtDate(l.date_to)}` : ""}
                  </div>
                  {l.reason && <p className="text-xs text-ink-soft">{l.reason}</p>}
                  {/* Per-class substitute listing (new format) */}
                  {hasPerClassSub && l.coach_leave_classes && l.coach_leave_classes.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {l.coach_leave_classes.map((lc, i) => (
                        <div key={i} className="text-xs flex items-center gap-1.5 text-ink-mute">
                          <Icon name="swim" className="w-3 h-3 shrink-0" />
                          <span className="font-medium text-ink">{lc.class?.name ?? "—"}</span>
                          {lc.substitute?.full_name && (
                            <><span>→</span><span className="font-semibold text-ocean-700">{lc.substitute.full_name}</span></>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Fallback: old single-substitute display for pre-migration leaves */}
                  {!hasPerClassSub && l.substitute_profile && (
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
  const [reason, setReason] = useState("");
  // selectedClasses: array of { class_id, substitute_id } — one entry per checked class
  const [selectedClasses, setSelectedClasses] = useState<{ class_id: string; substitute_id: string }[]>([]);
  const [allCoaches, setAllCoaches] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Cross-branch: load ALL active coaches (not filtered by branchId)
    const today = new Date().toISOString().split("T")[0];
    supabase.from("profiles")
      .select("id, full_name, suspend_until")
      .eq("role", "coach")
      .neq("id", coachId)
      .order("full_name")
      .then(({ data }) => {
        if (!data) return;
        const active = (data as { id: string; full_name: string; suspend_until: string | null }[])
          .filter(c => !c.suspend_until || c.suspend_until < today);
        setAllCoaches(active);
      });
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleClass = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClasses(prev => [...prev, { class_id: classId, substitute_id: "" }]);
    } else {
      setSelectedClasses(prev => prev.filter(c => c.class_id !== classId));
    }
  };

  const setSubstituteForClass = (classId: string, substituteId: string) => {
    setSelectedClasses(prev => prev.map(c => c.class_id === classId ? { ...c, substitute_id: substituteId } : c));
  };

  const canSubmit = selectedClasses.length > 0 && selectedClasses.every(c => !!c.substitute_id);

  const submit = async () => {
    if (!startDate || !endDate) return toast.error("Tanggal mulai dan selesai wajib diisi");
    if (selectedClasses.length === 0) return toast.error("Pilih minimal 1 kelas terdampak");
    if (!selectedClasses.every(c => c.substitute_id)) return toast.error("Setiap kelas wajib memiliki coach pengganti");
    setSaving(true);

    const { data: leave, error } = await supabase.from("coach_leaves").insert({
      coach_id: coachId,
      branch_id: branchId || null,
      type: type as "izin" | "sakit" | "lainnya",
      date_from: startDate, date_to: endDate,
      reason: reason || null,
      status: "pending" as const,
      // backward compat: primary substitute = first class's substitute
      substitute_id: selectedClasses[0]?.substitute_id || null,
    }).select("id").single();

    if (error || !leave) { toast.error("Gagal mengajukan izin", error?.message ?? ""); setSaving(false); return; }

    // Insert per-class entries with individual substitute_id
    await supabase.from("coach_leave_classes").insert(
      selectedClasses.map(c => ({
        leave_id: leave.id,
        class_id: c.class_id,
        substitute_id: c.substitute_id || null,
      }))
    );

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

          <Field label="Kelas terdampak" required hint="Pilih semua kelas yang terdampak. Setiap kelas wajib memiliki coach pengganti.">
            <div className="space-y-2 mt-1">
              {classes.length === 0 && <p className="text-xs text-ink-mute">Tidak ada kelas terdaftar.</p>}
              {classes.map(c => {
                const sel = selectedClasses.find(s => s.class_id === c.id);
                const isChecked = !!sel;
                const scheduleLabel = `${(c.schedule_days ?? []).join(", ")} ${c.time_start?.slice(0, 5) ?? ""}${c.time_end ? `–${c.time_end.slice(0, 5)}` : ""}`.trim();
                return (
                  <div key={c.id} className={`rounded-xl border transition-colors ${isChecked ? "border-ocean-400 bg-ocean-50/40" : "border-line"}`}>
                    <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => toggleClass(c.id, e.target.checked)}
                        className="mt-0.5 accent-ocean-600 w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{c.name}</div>
                        {scheduleLabel && <div className="text-xs text-ink-mute">{scheduleLabel}</div>}
                      </div>
                      {isChecked && (
                        sel?.substitute_id
                          ? <Icon name="check" className="w-4 h-4 text-ok-600 shrink-0 mt-0.5" />
                          : <Icon name="warn" className="w-4 h-4 text-warn-500 shrink-0 mt-0.5" />
                      )}
                    </label>
                    {isChecked && (
                      <div className="px-3 pb-2.5">
                        <Select
                          value={sel?.substitute_id ?? ""}
                          onChange={e => setSubstituteForClass(c.id, e.target.value)}
                        >
                          <option value="">— pilih coach pengganti —</option>
                          {allCoaches.map(coach => (
                            <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                          ))}
                        </Select>
                        {!sel?.substitute_id && (
                          <p className="text-xs text-warn-600 mt-1">Wajib pilih coach pengganti untuk kelas ini</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Field>

          <Field label="Alasan / deskripsi"><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Mis. Demam dan tidak fit" /></Field>
          <Btn variant="primary" size="lg" className="w-full" onClick={submit} disabled={saving || !canSubmit}>
            {saving ? "Mengirim…" : !canSubmit && selectedClasses.length > 0 ? "Lengkapi pengganti tiap kelas" : "Submit pengajuan"}
          </Btn>
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
  const activeClass = classes.find(c => c.id === activeClassId);

  const markAttendance = async (qrCode: string) => {
    // Lookup member by qr_code, join profile for suspend check
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("id, status, suspend_until, profile:profiles(full_name)")
      .eq("qr_code", qrCode)
      .single();

    if (mErr || !member) {
      toast.error("QR tidak dikenali", "Member tidak ditemukan");
      setTimeout(() => setLastScanned(null), 2000);
      return;
    }

    const typedMember = member as { id: string; status: string; suspend_until: string | null; profile: { full_name: string } | null };
    const name = typedMember.profile?.full_name ?? "Member";

    // Block suspended members
    const today = new Date().toISOString().split("T")[0];
    if (typedMember.status === "suspended" || (typedMember.suspend_until && typedMember.suspend_until >= today)) {
      toast.error(`${name} sedang disuspend`, "Member tidak bisa diabsen selama masa suspend");
      setTimeout(() => setLastScanned(null), 2500);
      return;
    }

    // Determine late status: member late if > 1 minute after class start
    const scanTime = new Date().toTimeString().slice(0, 8);
    const memberLateMin = activeClass?.time_start ? minutesLate(scanTime, activeClass.time_start) : -999;
    const memberStatus: "hadir" | "telat" = memberLateMin > 1 ? "telat" : "hadir";

    const { error } = await supabase.from("member_attendances").upsert({
      member_id: typedMember.id,
      class_id: activeClassId,
      session_date: today,
      status: memberStatus,
      method: "qr",
      marked_by: coachId,
    }, { onConflict: "class_id,member_id,session_date" });

    if (error) {
      toast.error(`Gagal absen ${name}`, error.message);
    } else if (memberStatus === "telat") {
      toast.error(`${name} hadir — Telat`, `${memberLateMin} menit setelah kelas dimulai`);
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

// Returns true if current time is within 3 hours before session start until session end
function isInClockInWindow(timeStart: string, timeEnd: string): boolean {
  const now = new Date();
  const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = toMinutes(timeStart);
  const endMin = toMinutes(timeEnd);
  return nowMin >= startMin - 180 && nowMin <= endMin;
}

/** Returns minutes since class start (HH:MM:SS or HH:MM). Negative = early. */
function minutesLate(clockInTime: string, classTimeStart: string): number {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return toMin(clockInTime) - toMin(classTimeStart);
}

function CoachHome({ setOverlay, setActive, coachId, branchId, profile, classes, holidayClassIds, clockedInIds, setClockedInIds, ownSpreadsheets }: {
  setOverlay: (v: string) => void;
  setActive: (tab: string) => void;
  coachId: string; branchId?: string;
  profile: ProfileData | null;
  classes: ClassRow[];
  holidayClassIds: Set<string>;
  clockedInIds: Set<string>;
  setClockedInIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  ownSpreadsheets: Map<string, string>;
}) {
  const supabase = createClient();
  const [monthStats, setMonthStats] = useState({ present: 0, leave: 0, sub: 0 });
  const [subClasses, setSubClasses] = useState<{ classId: string; className: string; originalCoach: string }[]>([]);
  // Class IDs the coach is on leave for today (clock-in blocked)
  const [leaveClassIds, setLeaveClassIds] = useState<Set<string>>(new Set());
  const [latestAnnouncement, setLatestAnnouncement] = useState<{ title: string; body: string } | null>(null);

  // Classes where THIS coach hasn't filled their own spreadsheet yet
  const unfilledClasses = classes.filter(c => !ownSpreadsheets.has(c.id));

   
  useEffect(() => {
    if (!coachId) return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    supabase.from("coach_attendances").select("id, status, class_id, session_date").eq("coach_id", coachId).gte("session_date", monthStart).lte("session_date", monthEnd)
      .then(({ data }) => {
        if (data) {
          setMonthStats({ present: data.filter(a => a.status === "present").length, leave: data.filter(a => a.status === "absent").length, sub: 0 });
          // Track which classes coach already clocked-in today
          const todayClockedIn = new Set<string>(
            (data as { id: string; status: string; class_id: string; session_date: string }[])
              .filter(a => a.session_date === today && a.status === "present" && a.class_id)
              .map(a => a.class_id)
          );
          setClockedInIds(todayClockedIn);
        }
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

    // Load latest announcement targeted to coach
    if (branchId) {
      supabase.from("announcements")
        .select("title, body, valid_from, valid_until")
        .eq("branch_id", branchId)
        .eq("active", true)
        .contains("target_roles", ["coach"])
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data: annData }) => {
          const match = (annData ?? []).find((a: { title: string; body: string; valid_from: string | null; valid_until: string | null }) => {
            if (a.valid_from && a.valid_from > today) return false;
            if (a.valid_until && a.valid_until < today) return false;
            return true;
          });
          setLatestAnnouncement(match ? { title: match.title, body: match.body } : null);
        });
    }
  }, [coachId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps
   

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const todayClasses = classes.filter(c => (c.schedule_days ?? []).includes(todayName));

  return (
    <div className="space-y-5">
      {latestAnnouncement && (
        <Card>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-ocean-50 text-ocean-700 flex items-center justify-center shrink-0">
              <Icon name="bell" className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <Status kind="active" className="!text-[10px] mb-1">PENGUMUMAN</Status>
              <div className="font-display font-bold text-ink">{latestAnnouncement.title}</div>
              <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{latestAnnouncement.body}</p>
            </div>
          </div>
        </Card>
      )}
      {unfilledClasses.length > 0 && (
        <div className="rounded-2xl border border-warn-200 bg-warn-50 p-4 flex gap-3 items-start">
          <span className="w-9 h-9 rounded-xl bg-warn-100 text-warn-600 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="alert" className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-warn-800 text-sm">Spreadsheet program belum diisi</div>
            <p className="text-warn-700 text-xs mt-0.5 leading-relaxed">
              {unfilledClasses.length === 1
                ? <>Kelas <span className="font-semibold">{unfilledClasses[0].name}</span> belum memiliki program bulanan.</>
                : <>{unfilledClasses.length} kelas belum memiliki program bulanan: <span className="font-semibold">{unfilledClasses.map(c => c.name).join(", ")}</span>.</>
              }
            </p>
            <button
              className="mt-2 text-xs font-semibold text-warn-700 underline underline-offset-2 hover:text-warn-900"
              onClick={() => setActive("kelas")}
            >
              Buka menu Kelas untuk mengisi →
            </button>
          </div>
        </div>
      )}
      <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
        <div className="caustics absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold">Selamat siang</div>
          <h2 className="font-display font-bold text-2xl mt-0.5">Halo, {profile?.full_name ?? "Coach"}</h2>
          <p className="text-white/80 text-sm mt-1.5">Anda punya {todayClasses.length + subClasses.length} kelas hari ini.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 min-w-0">
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
              const isClockedIn = clockedInIds.has(c.id);
              const inWindow = !isHoliday && !isOnLeave && !isClockedIn && isInClockInWindow(c.time_start, c.time_end);
              return (
                <Card key={c.id} className={isHoliday || isOnLeave ? "opacity-60" : ""}>
                  <div className="flex items-start gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isHoliday ? "bg-warn-50 text-warn-500" : isOnLeave ? "bg-danger-50 text-danger-400" : isClockedIn ? "bg-ok-50 text-ok-600" : "bg-wave-50 text-wave-600"}`}>
                      <Icon name={isHoliday ? "flag" : isOnLeave ? "clipboard" : isClockedIn ? "check" : "swim"} className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{c.name}</div>
                        {isHoliday && <Status kind="holiday">Libur</Status>}
                        {isOnLeave && <Status kind="inactive">Izin Hari Ini</Status>}
                        {isClockedIn && <Status kind="approved">Sudah Absen</Status>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5 font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""} · {c.enrolled}/{c.capacity} member</div>
                      {!isHoliday && !isOnLeave && !isClockedIn && (
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
              const isClockedIn = clockedInIds.has(s.classId);
              const inWindow = !isClockedIn && (subClass ? isInClockInWindow(subClass.time_start, subClass.time_end) : false);
              return (
                <Card key={s.classId} className="border-sub-200 bg-sub-50/30">
                  <div className="flex items-start gap-3">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isClockedIn ? "bg-ok-50 text-ok-600" : "bg-sub-100 text-sub-600"}`}>
                      <Icon name={isClockedIn ? "check" : "refresh"} className="w-6 h-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-display font-bold text-ink">{s.className}</div>
                        <Status kind="substitute">Pengganti</Status>
                        {isClockedIn && <Status kind="approved">Sudah Absen</Status>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5">Menggantikan: {s.originalCoach}</div>
                      {!isClockedIn && (
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
                      )}
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

function CoachAbsensi({ setOverlay, coachId, classes, holidayClassIds, clockedInIds }: {
  setOverlay: (v: string) => void;
  coachId: string; branchId?: string; classes: ClassRow[]; holidayClassIds: Set<string>; clockedInIds: Set<string>;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [openManual, setOpenManual] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [manualClassId, setManualClassId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualSessionDates, setManualSessionDates] = useState<{ value: string; label: string }[]>([]);
  const [memberAtt, setMemberAtt] = useState<MemberAttRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [attStatus, setAttStatus] = useState<Record<string, string>>({});
  const [memberAttHistory, setMemberAttHistory] = useState<{ id: string; class_id: string; session_date: string; class_name: string; total: number; hadir: number }[]>([]);

  // Detail sesi modal
  const [detailSesi, setDetailSesi] = useState<{ classId: string; className: string; date: string } | null>(null);
  const [detailRows, setDetailRows] = useState<{ member_id: string; full_name: string; status: string; method: string }[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Private session recording
  const [openPrivate, setOpenPrivate] = useState(false);
  const [privateClassId, setPrivateClassId] = useState("");
  const [privateDate, setPrivateDate] = useState(new Date().toISOString().split("T")[0]);
  const [privateNote, setPrivateNote] = useState("");
  const [savingPrivate, setSavingPrivate] = useState(false);
  const privateClasses = classes.filter(c => c.class_type === "private");

  const loadMemberAttHistory = useCallback(async () => {
    if (!coachId) return;
    // Get distinct (class_id, session_date) combos for all methods (manual + QR)
    const { data } = await supabase.from("member_attendances")
      .select("id, session_date, method, status, class_id, class:classes(name)")
      .in("class_id",
        (await supabase.from("class_coaches").select("class_id").eq("coach_id", coachId).then(r => r.data?.map(x => x.class_id) ?? []))
      )
      .order("session_date", { ascending: false })
      .limit(200);
    if (!data) return;
    // Group by (class_id, session_date)
    const grouped = new Map<string, { id: string; class_id: string; session_date: string; class_name: string; total: number; hadir: number }>();
    for (const row of data) {
      const cls = (row as unknown as { class: { name: string } | null }).class;
      const key = `${row.class_id}__${row.session_date}`;
      if (!grouped.has(key)) grouped.set(key, { id: key, class_id: row.class_id, session_date: row.session_date, class_name: cls?.name ?? "—", total: 0, hadir: 0 });
      const g = grouped.get(key)!;
      g.total++;
      if (row.status === "hadir") g.hadir++;
    }
    setMemberAttHistory([...grouped.values()].sort((a, b) => b.session_date.localeCompare(a.session_date)).slice(0, 15));
  }, [coachId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetailSesi = async (classId: string, className: string, date: string) => {
    setDetailSesi({ classId, className, date });
    setLoadingDetail(true);
    const { data } = await supabase
      .from("member_attendances")
      .select("member_id, status, method, member:members(profile:profiles(full_name))")
      .eq("class_id", classId)
      .eq("session_date", date)
      .order("status");
    setDetailRows(
      (data ?? []).map(r => ({
        member_id: r.member_id,
        full_name: (r as unknown as { member: { profile: { full_name: string } | null } | null }).member?.profile?.full_name ?? "—",
        status: r.status,
        method: r.method ?? "",
      }))
    );
    setLoadingDetail(false);
  };

  const PAGE_SIZE = 15;

  const loadHistory = useCallback(async (page: number, month: string, classId: string, append = false) => {
    if (!coachId) return;
    setHistoryLoading(true);
    const [y, m] = month.split("-");
    const monthStart = `${y}-${m}-01`;
    const monthEnd = new Date(Number(y), Number(m), 0).toISOString().split("T")[0]; // last day of month
    let q = supabase.from("coach_attendances")
      .select("id, session_date, clock_in_time, distance_meters, is_manual, manual_note, status, class_id, class:classes(name), manual_by_profile:profiles!coach_attendances_manual_by_fkey(full_name)")
      .eq("coach_id", coachId)
      .gte("session_date", monthStart)
      .lte("session_date", monthEnd)
      .order("session_date", { ascending: false })
      .order("clock_in_time", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE); // +PAGE_SIZE fetches PAGE_SIZE+1 to detect next page
    if (classId !== "all") q = q.eq("class_id", classId);
    const { data } = await q;
    const rows = (data ?? []) as unknown as AttendanceRow[];
    const hasMore = rows.length > PAGE_SIZE;
    const display = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    setHistory(prev => append ? [...prev, ...display] : display);
    setHistoryHasMore(hasMore);
    setHistoryLoading(false);
  }, [coachId, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    setHistoryPage(0);
    loadHistory(0, filterMonth, filterClassId);
    loadMemberAttHistory();
    setLoading(false);
  }, [coachId, loadMemberAttHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHistoryPage(0);
    loadHistory(0, filterMonth, filterClassId);
  }, [filterMonth, filterClassId]); // eslint-disable-line react-hooks/exhaustive-deps
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
    const memberIds = await supabase.from("member_classes").select("member_id").eq("class_id", classId)
      .then(r => r.data?.map(m => m.member_id) ?? []);
    if (memberIds.length === 0) { setMemberAtt([]); setAttStatus({}); return; }

    const { data } = await supabase.from("members")
      .select("id, status, suspend_until, profile:profiles(full_name, birth_date)")
      .in("id", memberIds);

    if (data) {
      // Filter out suspended members
      const today = new Date().toISOString().split("T")[0];
      const active = data.filter((m: Record<string, unknown>) => {
        const status = m.status as string;
        const suspendUntil = m.suspend_until as string | null;
        if (status === "suspended") return false;
        if (suspendUntil && suspendUntil >= today) return false;
        return true;
      });
      const rows = active.map(m => ({ id: "", member_id: m.id as string, session_date: date, status: "hadir", member: (m as { profile: { full_name: string; birth_date: string | null } | null }).profile }));
      setMemberAtt(rows as unknown as MemberAttRow[]);
      const init: Record<string, string> = {};
      active.forEach(m => { init[m.id as string] = "hadir"; });
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
    const rows = memberAtt.map(m => ({ class_id: manualClassId, member_id: m.member_id, session_date: manualDate, status: (attStatus[m.member_id] ?? "hadir") as "hadir" | "telat" | "izin" | "sakit" | "tidak_hadir", method: "manual" as const }));
    const { error } = await supabase.from("member_attendances").upsert(rows, { onConflict: "class_id,member_id,session_date" });
    setSaving(false);
    if (error) return toast.error("Gagal menyimpan", error.message);
    const hadirCount = rows.filter(r => r.status === "hadir").length;
    toast.success("Absensi member disimpan", `${hadirCount} hadir dari ${rows.length} member`);
    const savedClassId = manualClassId;
    const savedDate = manualDate;
    const savedClassName = classes.find(c => c.id === manualClassId)?.name ?? "—";
    setOpenManual(false);
    setManualClassId(""); setManualDate(""); setManualSessionDates([]); setMemberAtt([]); setAttStatus({});
    await loadMemberAttHistory();
    openDetailSesi(savedClassId, savedClassName, savedDate);
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
    // Decrement remaining_sessions on members table
    const { data: memberRow } = await supabase.from("members").select("remaining_sessions").eq("id", memberId).single();
    const remaining = memberRow?.remaining_sessions ?? 0;
    const newRemaining = Math.max(0, remaining - 1);
    await supabase.from("members").update({ remaining_sessions: newRemaining }).eq("id", memberId);
    // Increment sessions_used on the active session_pack bill for this member+class
    const { data: activeBill } = await supabase.from("bills")
      .select("id, sessions_total, sessions_used")
      .eq("member_id", memberId).eq("class_id", privateClassId).eq("type", "session_pack").eq("status", "paid")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (activeBill) {
      const newUsed = (activeBill.sessions_used ?? 0) + 1;
      await supabase.from("bills").update({ sessions_used: newUsed }).eq("id", activeBill.id);
      // Send reminder when only 1 session left
      if (activeBill.sessions_total != null && (activeBill.sessions_total - newUsed) <= 1) {
        await supabase.from("notifications").insert({
          user_id: memberId,
          title: "Sesi hampir habis",
          body: `Sisa sesi paket Anda tinggal ${activeBill.sessions_total - newUsed} sesi lagi. Hubungi admin untuk perpanjangan paket.`,
          icon: "warning",
          kind: "warn",
        });
      }
    }
    setSavingPrivate(false);
    toast.success("Sesi private dicatat", `Sisa sesi: ${newRemaining}`);
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
            const isClockedIn = clockedInIds.has(c.id);
            const inWindow = !isHoliday && !isClockedIn && isInClockInWindow(c.time_start, c.time_end);
            return (
              <Card key={c.id} className={isHoliday ? "opacity-60" : ""}>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-bold text-ink">{c.name}</div>
                      {isHoliday && <Status kind="holiday">Libur</Status>}
                      {isClockedIn && <Status kind="approved">Sudah Absen</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</div>
                  </div>
                  {!isHoliday && (isClockedIn ? (
                    <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-600 flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-5 h-5" strokeWidth={2.5} />
                    </span>
                  ) : inWindow ? (
                    <Btn variant="primary" size="md" icon="camera" onClick={() => setOverlay(`clockin:${c.id}`)}>Clock-In</Btn>
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

      <div className={`grid gap-3 ${privateClasses.length > 0 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
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
        {/* Header + filter */}
        <div className="p-5 border-b border-line space-y-3">
          <SectionTitle>History Absensi</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {/* Month filter */}
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="text-sm rounded-lg border border-line bg-white px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
                const val = d.toISOString().slice(0, 7);
                const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
                return <option key={val} value={val}>{label}</option>;
              })}
            </select>
            {/* Class filter */}
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="text-sm rounded-lg border border-line bg-white px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-ocean-300 max-w-[180px] truncate"
            >
              <option value="all">Semua kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {historyLoading && history.length === 0 ? (
          <div className="p-6 text-center text-ink-mute text-sm">Memuat…</div>
        ) : (
          <>
            <div className="divide-y divide-line">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.is_manual ? "bg-manual-50 text-manual-500" : h.status === "late" ? "bg-warn-50 text-warn-600" : "bg-ok-50 text-ok-600"}`}>
                    <Icon name={h.is_manual ? "edit" : "check"} className="w-4 h-4" strokeWidth={2.4} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-ink text-sm">{h.class?.name}</div>
                      {h.is_manual && <Status kind="manual">Manual</Status>}
                      {!h.is_manual && h.status === "late" && <Status kind="late">Telat</Status>}
                    </div>
                    <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)} · {h.clock_in_time?.slice(0, 5) ?? "—"}{h.distance_meters != null ? ` · ${h.distance_meters}m` : ""}</div>
                    {h.is_manual && h.manual_by_profile && (
                      <div className="text-[10px] text-ink-faint mt-0.5">oleh: {h.manual_by_profile.full_name}{h.manual_note ? ` · "${h.manual_note}"` : ""}</div>
                    )}
                  </div>
                </div>
              ))}
              {!historyLoading && history.length === 0 && (
                <div className="p-6 text-center text-ink-mute text-sm">Tidak ada absensi di periode ini.</div>
              )}
            </div>
            {historyHasMore && (
              <div className="p-4 border-t border-line">
                <button
                  onClick={() => {
                    const next = historyPage + 1;
                    setHistoryPage(next);
                    loadHistory(next, filterMonth, filterClassId, true);
                  }}
                  disabled={historyLoading}
                  className="w-full text-sm font-semibold text-ocean-700 hover:text-ocean-900 py-2 rounded-lg hover:bg-ocean-50 transition-colors disabled:opacity-50"
                >
                  {historyLoading ? "Memuat…" : "Tampilkan lebih banyak"}
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {memberAttHistory.length > 0 && (
        <Card padded={false}>
          <div className="p-5 border-b border-line"><SectionTitle sub="Klik sesi untuk lihat detail member">History Absensi Member</SectionTitle></div>
          <div className="divide-y divide-line">
            {memberAttHistory.map((h) => (
              <div
                key={h.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-paper-tint cursor-pointer active:bg-ocean-50 transition-colors"
                onClick={() => openDetailSesi(h.class_id, h.class_name, h.session_date)}
              >
                <span className="w-10 h-10 rounded-xl bg-wave-50 text-wave-600 flex items-center justify-center shrink-0">
                  <Icon name="users" className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{h.class_name}</div>
                  <div className="text-xs text-ink-mute font-mono">{fmtDate(h.session_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-ok-600 text-sm">{h.hadir}/{h.total}</div>
                    <div className="text-[10px] text-ink-faint">hadir</div>
                  </div>
                  <Icon name="arrow" className="w-4 h-4 text-ink-faint -rotate-90" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={openManual} onClose={() => { setOpenManual(false); setManualClassId(""); setManualDate(""); setManualSessionDates([]); setMemberAtt([]); setAttStatus({}); }} title="Absensi Manual Member"
        footer={<><Btn variant="ghost" onClick={() => { setOpenManual(false); setManualClassId(""); setManualDate(""); setManualSessionDates([]); setMemberAtt([]); setAttStatus({}); }}>Batal</Btn><Btn variant="primary" onClick={saveManualAtt} disabled={saving}>{saving ? "Menyimpan…" : "Submit"}</Btn></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="flex flex-wrap gap-1">
                    {([["hadir", "Hadir"], ["telat", "Telat"], ["izin", "Izin"], ["sakit", "Sakit"], ["tidak_hadir", "Absen"]] as const).map(([id, l]) => {
                      const active = (attStatus[m.member_id] ?? "hadir") === id;
                      const activeStyle = id === "hadir" ? "border-ok-500 bg-ok-50 text-ok-600" : id === "telat" ? "border-warn-500 bg-warn-50 text-warn-600" : id === "tidak_hadir" ? "border-danger-500 bg-danger-50 text-danger-600" : "border-warn-400 bg-warn-50 text-warn-500";
                      return (
                        <button key={id} onClick={() => setAttStatus(s => ({ ...s, [m.member_id]: id }))}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${active ? activeStyle : "border-line text-ink-mute hover:bg-paper-tint"}`}>{l}</button>
                      );
                    })}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Detail Sesi Modal */}
      <Modal
        open={detailSesi !== null}
        onClose={() => setDetailSesi(null)}
        title={detailSesi ? `${detailSesi.className} — ${fmtDate(detailSesi.date)}` : ""}
        size="sm"
        footer={<Btn variant="ghost" onClick={() => setDetailSesi(null)}>Tutup</Btn>}
      >
        {loadingDetail ? (
          <div className="py-6 text-center text-ink-mute text-sm">Memuat…</div>
        ) : (
          <div>
            {/* Summary bar */}
            <div className="flex gap-4 text-xs font-bold mb-4 pb-3 border-b border-line">
              <span className="flex items-center gap-1 text-ok-600">
                <span className="w-4 h-4 rounded-full bg-ok-100 flex items-center justify-center"><Icon name="check" className="w-2.5 h-2.5" strokeWidth={3} /></span>
                {detailRows.filter(r => r.status === "hadir").length} Hadir
              </span>
              <span className="flex items-center gap-1 text-warn-600">
                <span className="w-4 h-4 rounded-full bg-warn-100 flex items-center justify-center"><Icon name="clipboard" className="w-2.5 h-2.5" /></span>
                {detailRows.filter(r => r.status === "izin").length} Izin
              </span>
              <span className="flex items-center gap-1 text-orange-500">
                <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center"><Icon name="alert" className="w-2.5 h-2.5" /></span>
                {detailRows.filter(r => r.status === "sakit").length} Sakit
              </span>
              <span className="flex items-center gap-1 text-danger-500">
                <span className="w-4 h-4 rounded-full bg-danger-100 flex items-center justify-center"><Icon name="close" className="w-2.5 h-2.5" /></span>
                {detailRows.filter(r => r.status === "tidak_hadir").length} Absen
              </span>
            </div>
            <div className="space-y-0.5">
              {detailRows.map(r => (
                <div key={r.member_id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    r.status === "hadir" ? "bg-ok-50 text-ok-600" :
                    r.status === "izin" ? "bg-warn-50 text-warn-600" :
                    r.status === "sakit" ? "bg-orange-50 text-orange-500" :
                    "bg-danger-50 text-danger-500"
                  }`}>
                    <Icon name={r.status === "hadir" ? "check" : r.status === "izin" ? "clipboard" : r.status === "sakit" ? "alert" : "close"} className="w-4 h-4" strokeWidth={r.status === "hadir" ? 2.5 : 2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{r.full_name}</div>
                  </div>
                  <Status kind={r.status === "hadir" ? "approved" : r.status === "izin" ? "excused" : r.status === "sakit" ? "sick" : "inactive"}>
                    {r.status === "hadir" ? "Hadir" : r.status === "izin" ? "Izin" : r.status === "sakit" ? "Sakit" : "Tidak Hadir"}
                  </Status>
                </div>
              ))}
              {detailRows.length === 0 && (
                <div className="py-4 text-center text-ink-mute text-sm">Tidak ada data absensi untuk sesi ini.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Spreadsheet Program ────────────────────────────────────────────────────────

function SpreadsheetModal({ classId, className, coachId, currentUrl, onClose, onSaved }: {
  classId: string; className: string; coachId: string; currentUrl?: string | null; onClose: () => void; onSaved?: () => void;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [url, setUrl] = useState(currentUrl ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = url.trim();
    if (!trimmed) return toast.error("Masukkan link spreadsheet terlebih dahulu");
    setSaving(true);
    // Upsert per-coach entry
    const { error } = await supabase
      .from("class_coach_spreadsheets")
      .upsert(
        { class_id: classId, coach_id: coachId, spreadsheet_url: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "class_id,coach_id" }
      );
    if (error) { setSaving(false); return toast.error("Gagal menyimpan", error.message); }
    // Keep classes.spreadsheet_filled in sync (aggregate: any coach filled = true)
    await supabase.from("classes").update({ spreadsheet_filled: true }).eq("id", classId);
    setSaving(false);
    toast.success("Link spreadsheet tersimpan");
    onSaved?.();
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Spreadsheet Program — ${className}`} size="md"
      footer={<><Btn variant="ghost" onClick={onClose}>Batal</Btn><Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Btn></>}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-800 leading-relaxed">
          Buat spreadsheet program kelas di Google Sheets, lalu paste link-nya di sini. Pastikan link bisa diakses oleh siapa pun yang memiliki link.
        </div>
        <Field label="Link Google Sheets / Spreadsheet">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            type="url"
          />
        </Field>
        {currentUrl && (
          <a href={currentUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-ocean-600 hover:text-ocean-800 font-semibold">
            <Icon name="link" className="w-3.5 h-3.5" />
            Buka spreadsheet saat ini
          </a>
        )}
      </div>
    </Modal>
  );
}

// ── Kelas ──────────────────────────────────────────────────────────────────────

// Captured once at module load to avoid impure Date.now() calls during render
const MODULE_NOW_MS = Date.now();

type MemberDetail = NonNullable<NonNullable<ClassRow["member_classes"]>[number]["member"]>;

function calcAgeFromBirthDate(birthDate: string, nowMs: number = MODULE_NOW_MS): number {
  return Math.floor((nowMs - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function MemberDetailModal({ member, onClose }: { member: MemberDetail; onClose: () => void }) {
  const name = member.profile?.full_name ?? "—";
  const age = member.profile?.birth_date ? calcAgeFromBirthDate(member.profile.birth_date) : null;

  const rows: [string, string | null | undefined][] = [
    ["Usia", age != null ? `${age} tahun` : null],
    ["Jenis kelamin", member.profile?.gender === "male" ? "Laki-laki" : member.profile?.gender === "female" ? "Perempuan" : null],
    ["No. HP", member.profile?.phone],
    ["Alamat", member.profile?.address],
    ["Riwayat kesehatan / alergi", member.profile?.health_notes],
  ];

  return (
    <Modal open onClose={onClose} title={name} size="sm"
      footer={
        <div className="flex items-center gap-2 w-full">
          {member.profile?.phone && (
            <a href={waLink(`Halo ${name}, saya Coach dari Next Swimming School.`)} target="_blank" rel="noreferrer" className="flex-1">
              <Btn variant="wa" className="w-full" icon="whatsapp">Chat Member</Btn>
            </a>
          )}
          <Btn variant="ghost" onClick={onClose}>Tutup</Btn>
        </div>
      }>
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={name} size={48} />
          <div>
            <div className="font-display font-bold text-ink text-base">{name}</div>
            {age != null && <div className="text-xs text-ink-mute">{age} tahun</div>}
          </div>
        </div>
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex gap-2 py-2 border-b border-line last:border-0">
            <div className="text-xs text-ink-mute w-36 shrink-0 pt-0.5">{label}</div>
            <div className="text-sm text-ink font-medium flex-1">{value}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function CoachKelas({ classes, coachId, classSpreadsheets, ownSpreadsheets, onRefreshClasses }: {
  classes: ClassRow[];
  coachId: string;
  classSpreadsheets: Map<string, CoachSpreadsheetRow[]>;
  ownSpreadsheets: Map<string, string>;
  onRefreshClasses?: () => void;
}) {
  const supabase = createClient();
  const [det, setDet] = useState<ClassRow | null>(null);
  const [openSpreadsheet, setOpenSpreadsheet] = useState<ClassRow | null>(null);
  const [memberDet, setMemberDet] = useState<MemberDetail | null>(null);
  const [memberAttHistory, setMemberAttHistory] = useState<{ memberId: string; memberName: string; classId: string; className: string; rows: { id: string; session_date: string; status: string }[] } | null>(null);
  const [loadingAtt, setLoadingAtt] = useState(false);

  const openMemberAtt = async (memberId: string, memberName: string, classId: string, className: string) => {
    setLoadingAtt(true);
    setMemberAttHistory({ memberId, memberName, classId, className, rows: [] });
    const { data } = await supabase.from("member_attendances")
      .select("id, session_date, status")
      .eq("member_id", memberId).eq("class_id", classId)
      .order("session_date", { ascending: false }).limit(50);
    setMemberAttHistory({ memberId, memberName, classId, className, rows: (data ?? []).map(r => ({ id: r.id, session_date: r.session_date, status: r.status })) });
    setLoadingAtt(false);
  };

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
                  {ownSpreadsheets.has(c.id)
                    ? <a href={ownSpreadsheets.get(c.id)!} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-ok-600 font-semibold hover:underline"><Icon name="link" className="w-3 h-3" />Program Saya</a>
                    : <span className="text-warn-500 font-semibold">Program belum diisi</span>
                  }
                </div>
              </div>
              <Btn variant="soft" size="sm" icon="book" onClick={e => { e.stopPropagation(); setOpenSpreadsheet(c); }}>Program</Btn>
            </div>
          </Card>
        ))}
        {classes.length === 0 && <Card><p className="text-ink-mute text-sm">Belum ada kelas yang diassign.</p></Card>}
      </div>

      {/* Detail kelas modal */}
      <Modal open={!!det} onClose={() => setDet(null)} title={det?.name ?? ""} size="lg"
        footer={
          <div className="flex items-center gap-2 w-full">
            {det && ownSpreadsheets.has(det.id) && (
              <a href={ownSpreadsheets.get(det.id)!} target="_blank" rel="noreferrer">
                <Btn variant="soft" size="sm" icon="link">Buka Spreadsheet Saya</Btn>
              </a>
            )}
            <div className="flex-1" />
            <Btn variant="soft" size="sm" icon="book" onClick={() => { setOpenSpreadsheet(det); setDet(null); }}>
              {det && ownSpreadsheets.has(det.id) ? "Edit Program" : "Isi Program"}
            </Btn>
            <Btn variant="ghost" onClick={() => setDet(null)}>Tutup</Btn>
          </div>
        }>
        {det && (
          <div className="space-y-4">
            {/* Branch info */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <Icon name="map-pin" className="w-4 h-4 text-ocean-500 shrink-0" />
              <div>
                <span className="font-semibold text-ink">{det.branch?.name ?? "—"}</span>
                {det.branch?.city && <span className="text-ink-mute"> · {det.branch.city}</span>}
                {det.branch?.address && <div className="text-xs text-ink-mute mt-0.5">{det.branch.address}</div>}
              </div>
            </div>
            {det.goals && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Tujuan</div><p className="text-sm text-ink-soft mt-1">{det.goals}</p></div>}
            {det.description && <div><div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">Deskripsi</div><p className="text-sm text-ink-soft mt-1">{det.description}</p></div>}
            {!ownSpreadsheets.has(det.id) && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-sm text-warn-800">
                <Icon name="alert" className="w-4 h-4 shrink-0 text-warn-500" />
                Spreadsheet program Anda untuk kelas ini belum diisi.
              </div>
            )}
            {(classSpreadsheets.get(det.id) ?? []).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mb-2">Spreadsheet Semua Coach</div>
                <div className="space-y-2">
                  {(classSpreadsheets.get(det.id) ?? []).map(s => (
                    <div key={s.coach_id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-line bg-paper-tint">
                      <Avatar name={s.coach?.full_name ?? "?"} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          {s.coach?.full_name ?? "—"}
                          {s.coach_id === coachId && <span className="ml-1.5 text-[10px] text-ocean-600 font-bold uppercase tracking-wide">Anda</span>}
                        </div>
                        <div className="text-[10px] text-ink-faint font-mono">{new Date(s.updated_at).toLocaleDateString("id-ID")}</div>
                      </div>
                      <a href={s.spreadsheet_url} target="_blank" rel="noreferrer"
                        className="shrink-0 text-ocean-600 flex items-center gap-1 text-xs font-semibold hover:underline">
                        <Icon name="link" className="w-3.5 h-3.5" />Buka
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <SectionTitle sub={`${det.enrolled} member terdaftar · klik untuk detail`}>Daftar Member</SectionTitle>
              <div className="space-y-2">
                {(det.member_classes ?? []).map((mc, i) => {
                  const memberAge = mc.member?.profile?.birth_date ? calcAgeFromBirthDate(mc.member.profile.birth_date) : null;
                  return mc.member && (
                  <div key={mc.member.id ?? i} className="flex items-center gap-2 p-2.5 rounded-xl border border-line hover:bg-paper-tint transition">
                    <button onClick={() => setMemberDet(mc.member!)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <Avatar name={mc.member.profile?.full_name ?? "?"} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink truncate">{mc.member.profile?.full_name ?? "—"}</div>
                        {mc.member.profile?.birth_date && (
                          <div className="text-xs text-ink-mute">
                            {memberAge} tahun
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => openMemberAtt(mc.member!.id, mc.member!.profile?.full_name ?? "—", det.id, det.name)}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-soft hover:bg-ocean-50 hover:border-ocean-200 hover:text-ocean-700 transition flex items-center gap-1">
                      <Icon name="check" className="w-3 h-3" />Absensi
                    </button>
                  </div>
                );
                })}
                {(det.member_classes?.length ?? 0) === 0 && <div className="text-sm text-ink-mute">Belum ada member terdaftar.</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Member detail modal */}
      {memberDet && <MemberDetailModal member={memberDet} onClose={() => setMemberDet(null)} />}

      {/* Member attendance history modal */}
      {memberAttHistory && (
        <Modal open={!!memberAttHistory} onClose={() => setMemberAttHistory(null)}
          title={`Absensi — ${memberAttHistory.memberName}`}
          footer={<Btn variant="ghost" onClick={() => setMemberAttHistory(null)}>Tutup</Btn>}>
          <div className="text-xs text-ink-mute mb-3 font-semibold uppercase tracking-widest">{memberAttHistory.className}</div>
          {loadingAtt ? (
            <div className="text-center py-6 text-ink-mute text-sm">Memuat…</div>
          ) : memberAttHistory.rows.length === 0 ? (
            <div className="text-center py-6 text-ink-mute text-sm">Belum ada data absensi di kelas ini.</div>
          ) : (
            <div className="divide-y divide-line -mx-5">
              {memberAttHistory.rows.map((r) => {
                const d = new Date(r.session_date + "T00:00:00");
                const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
                const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                const statusLabel = r.status === "hadir" ? "Hadir" : r.status === "izin" ? "Izin" : r.status === "sakit" ? "Sakit" : "Absen";
                const statusKind = r.status === "hadir" ? "present" : r.status === "izin" ? "excused" : r.status === "sakit" ? "sick" : "absent";
                return (
                  <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.status === "hadir" ? "bg-ok-50 text-ok-600" : r.status === "tidak_hadir" || r.status === "absent" ? "bg-danger-50 text-danger-500" : "bg-warn-50 text-warn-600"}`}>
                      <Icon name={r.status === "hadir" ? "check" : r.status === "tidak_hadir" || r.status === "absent" ? "x" : "info"} className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                    <div className="flex-1 text-sm font-mono text-ink-soft">{dateStr}</div>
                    <Status kind={statusKind as "present" | "absent" | "excused" | "sick"}>{statusLabel}</Status>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Spreadsheet modal */}
      {openSpreadsheet && (
        <SpreadsheetModal
          classId={openSpreadsheet.id}
          className={openSpreadsheet.name}
          coachId={coachId}
          currentUrl={ownSpreadsheets.get(openSpreadsheet.id) ?? null}
          onClose={() => setOpenSpreadsheet(null)}
          onSaved={onRefreshClasses}
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
      const classIds = [...new Set(att.map((a: Record<string, unknown>) => a.class_id as string).filter(Boolean))];
      // Fetch both: tarif khusus for this coach AND tarif umum (coach_id null)
      const { data: rates } = classIds.length > 0
        ? await supabase.from("coach_rates").select("class_id, coach_id, rate_per_session")
            .in("class_id", classIds as string[])
            .or(`coach_id.eq.${coachId},coach_id.is.null`)
        : { data: [] };

      // Build rateMap: tarif khusus overrides tarif umum
      const generalMap: Record<string, number> = {};
      const coachMap: Record<string, number> = {};
      (rates ?? []).forEach((r: { class_id: string; coach_id: string | null; rate_per_session: number | null }) => {
        if (r.rate_per_session == null) return;
        if (!r.coach_id) generalMap[r.class_id] = r.rate_per_session;
        else coachMap[r.class_id] = r.rate_per_session;
      });
      // Tarif khusus takes priority, fallback to tarif umum, then null (no rate set)
      const rateMap: Record<string, number | null> = {};
      classIds.forEach(id => { rateMap[id] = coachMap[id] ?? generalMap[id] ?? null; });

      const sessionsWithRate = att.map((a: Record<string, unknown>) => {
        const cls = a.class as { id?: string; name?: string } | null;
        const classId = a.class_id as string;
        return {
          id: a.id as string,
          session_date: a.session_date as string,
          class_id: classId,
          rate_per_session: rateMap[classId] ?? 0,
          rate_set: rateMap[classId] != null,
          class: cls ? { name: cls.name ?? "" } : null,
        };
      });
      setSessions(sessionsWithRate as InvoiceSession[]);
      // Only auto-select sessions that have a rate set
      setSelected(new Set(sessionsWithRate.filter(s => s.rate_set).map(s => s.id)));
    }

    const { data: inv } = await supabase.from("coach_invoices")
      .select("id, invoice_number, period_label, total_amount, status, bank_info, coach_invoice_items(class_id, session_count, rate, class:classes(name))")
      .eq("coach_id", coachId).order("created_at", { ascending: false });
    if (inv) setPastInvoices(inv as unknown as PastInvoice[]);
    setLoading(false);
  }, [coachId, monthFilter, supabase]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data loader */
  useEffect(() => { load(); }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = (id: string) => { const s = new Set(selected); if (s.has(id)) { s.delete(id); } else { s.add(id); } setSelected(s); };
  const total = sessions.filter(s => selected.has(s.id)).reduce((a, s) => a + s.rate_per_session, 0);

  const generate = async () => {
    if (selected.size === 0) return toast.error("Pilih minimal 1 sesi");
    const noRate = sessions.filter(s => selected.has(s.id) && !s.rate_set);
    if (noRate.length > 0) return toast.error("Tarif belum diset", `Kelas belum ada tarif: ${noRate.map(s => s.class?.name ?? s.class_id).join(", ")}`);
    setGenerating(true);
    const [y, m] = monthFilter.split("-");
    const periodLabel = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const num = `INV-${monthFilter.replace("-", "")}-${coachId.slice(0, 6).toUpperCase()}`;

    const { data: inv, error: invError } = await supabase.from("coach_invoices").insert({
      coach_id: coachId, branch_id: branchId, invoice_number: num,
      period_label: periodLabel, total_amount: total,
      bank_info: profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : null,
      status: "pending",
    }).select("id").single();

    if (invError || !inv) { toast.error("Gagal membuat invoice", invError?.message); setGenerating(false); return; }

    // Link sessions to invoice
    const selectedSessions = sessions.filter(s => selected.has(s.id));
    await supabase.from("coach_invoice_items").insert(selectedSessions.map(s => ({
      invoice_id: inv.id, attendance_id: s.id, class_id: s.class_id, rate: s.rate_per_session, session_count: 1,
    })));
    // Mark attendances as invoiced
    await supabase.from("coach_attendances").update({ invoice_id: inv.id }).in("id", [...selected]);

    // Notify owner — fetch all owner profiles for this branch
    const { data: ownerProfiles } = await supabase.from("profiles")
      .select("id").eq("branch_id", branchId).eq("role", "owner");
    if (ownerProfiles && ownerProfiles.length > 0) {
      await supabase.from("notifications").insert(ownerProfiles.map((op: { id: string }) => ({
        user_id: op.id,
        title: "Invoice baru dari coach",
        body: `${profile?.full_name ?? "Coach"} mengirimkan invoice ${num} — ${periodLabel} (${fmtIDR(total)})`,
        icon: "invoice",
        kind: "info",
      })));
    }

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
        <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="!w-36 sm:!w-44 font-mono" />
        <button onClick={() => setSelected(new Set(sessions.map(s => s.id)))} className="text-sm font-bold text-ocean-600 hover:text-ocean-700">Pilih semua</button>
      </div>
      {loading ? <div className="text-center text-ink-mute p-6">Memuat sesi…</div> : (
        <>
          <Card padded={false}>
            {sessions.length === 0 ? <div className="p-6 text-center text-ink-mute">Tidak ada sesi yang belum diinvoice bulan ini.</div> : (
              <div className="divide-y divide-line">
                {sessions.map((s) => (
                  <label key={s.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-paper-tint cursor-pointer ${selected.has(s.id) ? "bg-ocean-50/40" : ""} ${!s.rate_set ? "opacity-60" : ""}`}>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 rounded border-line-strong text-ocean-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink text-sm">{s.class?.name}</div>
                      <div className="text-xs text-ink-mute">{fmtDate(s.session_date)}</div>
                    </div>
                    {s.rate_set
                      ? <div className="font-mono font-bold text-sm shrink-0">{fmtIDR(s.rate_per_session)}</div>
                      : <div className="text-xs font-semibold text-warn-600 flex items-center gap-1 shrink-0"><Icon name="warning" className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tarif belum diset</span><span className="sm:hidden">No tarif</span></div>
                    }
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
                  // Group items by class name, sum session counts
                  const itemMap: Record<string, { name: string; sessions: number; rate: number }> = {};
                  (iv.coach_invoice_items ?? []).forEach(item => {
                    const key = item.class_id;
                    if (!itemMap[key]) itemMap[key] = { name: item.class?.name ?? item.class_id, sessions: 0, rate: item.rate };
                    itemMap[key].sessions += item.session_count;
                  });
                  const itemRows = Object.values(itemMap).map(item =>
                    `<div class="row"><span>${item.name}</span><span>${item.sessions} sesi × Rp ${item.rate.toLocaleString("id-ID")} = <b>Rp ${(item.sessions * item.rate).toLocaleString("id-ID")}</b></span></div>`
                  ).join("");
                  w.document.write(`<!DOCTYPE html><html><head><title>${iv.invoice_number}</title>
                    <style>body{font-family:sans-serif;padding:32px;color:#0f172a;max-width:640px;margin:auto}
                    h1{font-size:22px;font-weight:700;margin-bottom:2px}
                    .sub{font-size:13px;color:#64748b;margin-bottom:20px}
                    .section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:20px 0 6px}
                    .meta{background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.8;margin-bottom:16px}
                    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
                    .total{display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:4px}
                    .badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;background:${iv.status === "paid" ? "#dcfce7" : "#fef9c3"};color:${iv.status === "paid" ? "#166534" : "#854d0e"}}
                    footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
                    </style></head><body>
                    <h1>Invoice Coach</h1>
                    <div class="sub">${iv.invoice_number} &nbsp;·&nbsp; <span class="badge">${iv.status === "paid" ? "Lunas" : "Pending"}</span></div>
                    <div class="section">Informasi</div>
                    <div class="meta">
                      <b>Periode:</b> ${iv.period_label}<br/>
                      <b>Coach:</b> ${profile?.full_name ?? "—"}<br/>
                      <b>Rekening:</b> ${iv.bank_info ?? (profile?.bank_name ? `${profile.bank_name} - ${profile.bank_account} a/n ${profile.bank_holder}` : "—")}
                    </div>
                    <div class="section">Rincian Kelas</div>
                    ${itemRows || '<div class="row"><span style="color:#94a3b8">Tidak ada rincian</span></div>'}
                    <div class="total"><span>Total</span><span>Rp ${iv.total_amount.toLocaleString("id-ID")}</span></div>
                    <footer>Next Swimming School &nbsp;·&nbsp; Dicetak ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</footer>
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
  const [personality, setPersonality] = useState("");
  const [motivation, setMotivation] = useState("");
  const [learningAchievements, setLearningAchievements] = useState("");
  const [bestTimes, setBestTimes] = useState<Partial<Record<BtKey, string>>>({});
  const [bestTimeIds, setBestTimeIds] = useState<Partial<Record<BtKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

   
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
        .select("id, member_id, class_id, locked, scores, notes, personality, motivation, learning_achievements, member:members(profile:profiles(full_name)), class:classes(name, class_criteria(id, label, kind, options, sort_order))")
        .eq("period_id", periodData.id).eq("coach_id", coachId);
      if (e) { setEntries(e as unknown as RaporEntry[]); setPage(0); }
      setLoading(false);
    })();
  }, [coachId, branchId]); // eslint-disable-line react-hooks/exhaustive-deps
   

  const openEntry = async (e: RaporEntry) => {
    // Load criteria for this class
    const classCriteria = ((e as unknown as { class?: { class_criteria?: Criterion[] } }).class?.class_criteria ?? [])
      .sort((a, b) => ((a as unknown as { sort_order: number }).sort_order ?? 0) - ((b as unknown as { sort_order: number }).sort_order ?? 0));
    setCriteria(classCriteria as Criterion[]);
    // Pre-fill existing scores
    const existing = (e as unknown as { scores?: Record<string, number | string> }).scores ?? {};
    setScores(existing);
    setNotes((e as unknown as { notes?: string }).notes ?? "");
    setPersonality(e.personality ?? "");
    setMotivation(e.motivation ?? "");
    setLearningAchievements(e.learning_achievements ?? "");
    // Load best times for this member
    const { data: btRows } = await supabase
      .from("member_best_times")
      .select("id, stroke, distance, time_seconds")
      .eq("member_id", e.member_id)
      .eq("branch_id", branchId);
    const btMap: Partial<Record<BtKey, string>> = {};
    const btIdMap: Partial<Record<BtKey, string>> = {};
    for (const row of (btRows ?? []) as BestTimeRow[]) {
      const key = `${row.stroke}_${row.distance}` as BtKey;
      btMap[key] = String(row.time_seconds);
      btIdMap[key] = row.id;
    }
    setBestTimes(btMap);
    setBestTimeIds(btIdMap);
    setOpen(e);
  };

  const saveRapor = async () => {
    if (!open || !period) return;
    // Check period still open
    const today = new Date().toISOString().split("T")[0];
    if (period.date_to < today) return toast.error("Periode rapor sudah berakhir", "Hubungi admin untuk memperpanjang periode.");
    const { data: periodCheck } = await supabase.from("rapor_periods").select("is_open").eq("id", period.id).single();
    if (!periodCheck?.is_open) return toast.error("Periode rapor sudah ditutup", "Hubungi admin untuk membuka kembali periode.");
    setSaving(true);
    const isNew = !open.locked;
    const { error } = await supabase.from("rapor_entries")
      .update({
        scores, notes,
        personality: personality || null,
        motivation: motivation || null,
        learning_achievements: learningAchievements || null,
        filled_at: new Date().toISOString(),
        locked: true,
      })
      .eq("id", open.id);
    if (error) { setSaving(false); return toast.error("Gagal menyimpan rapor", error.message); }
    // Upsert best times
    for (const stroke of STROKES) {
      for (const dist of DISTANCES) {
        const key = `${stroke}_${dist}` as BtKey;
        const val = bestTimes[key];
        if (!val || val.trim() === "") continue;
        const timeSec = parseFloat(val);
        if (isNaN(timeSec) || timeSec <= 0) continue;
        const existingId = bestTimeIds[key];
        if (existingId) {
          await supabase.from("member_best_times").update({ time_seconds: timeSec, coach_id: coachId, recorded_at: new Date().toISOString().split("T")[0] }).eq("id", existingId);
        } else {
          const { data: ins } = await supabase.from("member_best_times").insert({ member_id: open.member_id, branch_id: branchId, stroke, distance: dist, time_seconds: timeSec, coach_id: coachId }).select("id").single();
          if (ins) setBestTimeIds(prev => ({ ...prev, [key]: ins.id }));
        }
      }
    }
    setSaving(false);
    // Notify member when rapor is first filled (not on updates)
    if (isNew) {
      await supabase.from("notifications").insert({
        user_id: open.member_id,
        title: "Rapor tersedia",
        body: `Rapor Anda untuk periode "${period.label}" sudah diisi coach. Buka menu Rapor untuk melihat hasilnya.`,
        icon: "book",
        kind: "info",
      });
    }
    toast.success("Rapor disimpan");
    setOpen(null);
    setEntries(prev => prev.map(e => e.id === open.id ? {
      ...e, locked: true, scores, notes,
      personality: personality || null,
      motivation: motivation || null,
      learning_achievements: learningAchievements || null,
    } : e));
  };

  // Derived values for summary & pagination
  const totalFilled  = entries.filter(e => e.locked).length;
  const totalPending = entries.filter(e => !e.locked).length;
  const pct          = entries.length > 0 ? Math.round(totalFilled / entries.length * 100) : 0;
  const totalPages   = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage     = Math.min(page, Math.max(0, totalPages - 1));
  const paginated    = entries.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Hero period card */}
      {period ? (
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-wave-500/30 blur-2xl" />
          <div className="relative">
            <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> Periode aktif
            </div>
            <div className="font-display font-bold text-2xl mt-0.5">{period.label}</div>
            {!loading && (
              <div className="flex flex-wrap gap-2.5 mt-3">
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Sudah diisi</div>
                  <div className="font-display font-bold text-xl text-ok-300">{totalFilled}</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Belum diisi</div>
                  <div className="font-display font-bold text-xl text-warn-300">{totalPending}</div>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-3.5 py-2 ring-1 ring-white/20">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">Penyelesaian</div>
                  <div className="font-display font-bold text-xl">{pct}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card><p className="text-ink-mute">Tidak ada periode rapor aktif.</p></Card>
      )}

      {/* Progress summary card */}
      {period && !loading && entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-line shadow-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold text-ink">Progress Pengisian Rapor</div>
            <div className="text-sm font-bold text-ocean-700 tabular-nums">{totalFilled}/{entries.length} member</div>
          </div>
          <div className="h-2.5 bg-paper-deep rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-ok-500" : pct >= 50 ? "bg-wave-500" : "bg-warn-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center">
              <div className="font-display font-bold text-lg text-ok-600">{totalFilled}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">Selesai</div>
            </div>
            <div className="text-center border-x border-line">
              <div className="font-display font-bold text-lg text-warn-600">{totalPending}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">Belum</div>
            </div>
            <div className="text-center flex flex-col items-center gap-1">
              {pct === 100
                ? <Status kind="approved" dot={false}>Semua Selesai</Status>
                : pct > 0
                ? <Status kind="pending" dot={false}>{pct}% selesai</Status>
                : <Status kind="inactive" dot={false}>Belum mulai</Status>}
              <div className="text-[10px] uppercase tracking-widest text-ink-faint font-bold">Status</div>
            </div>
          </div>
        </div>
      )}

      {/* Entry list */}
      {loading ? <div className="text-ink-mute text-sm">Memuat…</div> : (
        <div className="space-y-3">
          {paginated.map((e) => (
            <Card key={e.id || e.member_id} className="flex items-center gap-3">
              <Avatar name={e.member?.profile?.full_name ?? "?"} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{e.member?.profile?.full_name}</div>
                <div className="text-xs text-ink-mute">{e.class?.name}</div>
              </div>
              {e.locked ? <Status kind="approved">Selesai</Status> : <Status kind="pending">Belum</Status>}
              <Btn variant={e.locked ? "ghost" : "primary"} size="sm" onClick={() => openEntry(e)}>
                {e.locked ? "Edit" : "Isi rapor"}
              </Btn>
            </Card>
          ))}
          {entries.length === 0 && period && <p className="text-ink-mute text-sm">Belum ada entri rapor untuk periode ini.</p>}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <span className="text-xs text-ink-mute tabular-nums">
                {entries.length} member · hal. {safePage + 1}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={safePage === 0} onClick={() => setPage(0)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">«</button>
                <button type="button" disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                  .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                    if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((item, idx) => item === "…"
                    ? <span key={`e${idx}`} className="px-2 text-ink-faint text-sm">…</span>
                    : <button key={item} type="button" onClick={() => setPage(item as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${safePage === item ? "bg-ocean-600 text-white" : "border border-line text-ink-mute hover:bg-paper-tint"}`}>{(item as number) + 1}</button>
                  )
                }
                <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">›</button>
                <button type="button" disabled={safePage === totalPages - 1} onClick={() => setPage(totalPages - 1)}
                  className="px-2 py-1.5 rounded-lg border border-line text-ink-mute text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper-tint transition">»</button>
              </div>
            </div>
          )}
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
                  onChange={e => setScores(s => ({ ...s, [c.id]: e.target.value }))} placeholder="Mis. Sudah cukup baik, perlu latihan lebih konsisten." />
              )}
            </div>
          ))}
          <Field label="Catatan umum coach"><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mis. Member menunjukkan progres yang baik bulan ini, terutama pada teknik pernapasan." /></Field>

          {/* Personal Best Time */}
          <div className="border-t border-line pt-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-mute">Personal Best Time</div>
            <p className="text-xs text-ink-mute -mt-1">Masukkan waktu terbaik (detik, mis. 34.58). Kosongkan jika belum ada catatan.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ink-mute uppercase tracking-widest">
                    <th className="text-left pb-2 pr-3 font-bold">Gaya</th>
                    {DISTANCES.map(d => <th key={d} className="text-center pb-2 px-1.5 font-bold w-20">{d}m</th>)}
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {STROKES.map(stroke => (
                    <tr key={stroke} className="border-t border-line/50">
                      <td className="py-1.5 pr-3 font-semibold text-ink capitalize whitespace-nowrap">{stroke === "IM" ? "IM" : stroke.charAt(0).toUpperCase() + stroke.slice(1)}</td>
                      {DISTANCES.map(dist => {
                        const key = `${stroke}_${dist}` as BtKey;
                        return (
                          <td key={dist} className="py-1.5 px-1.5">
                            <input
                              type="number" min="0" step="0.01"
                              value={bestTimes[key] ?? ""}
                              onChange={ev => setBestTimes(prev => ({ ...prev, [key]: ev.target.value }))}
                              placeholder="—"
                              className="w-full border border-line rounded-lg px-2 py-1 text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white placeholder:text-ink-faint"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-line pt-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-ink-mute">Evaluasi Karakter</div>
            <Field label="Kepribadian" hint="Mis. Disiplin, percaya diri, komunikatif">
              <Input value={personality} onChange={e => setPersonality(e.target.value)} placeholder="Mis. Disiplin, kooperatif, antusias" />
            </Field>
            <Field label="Motivasi Belajar" hint="Seberapa besar semangat belajar member">
              <Input value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Mis. Sangat antusias dan selalu tepat waktu" />
            </Field>
            <Field label="Capaian Pembelajaran" hint="Pencapaian spesifik yang dicapai dalam periode ini">
              <Textarea rows={2} value={learningAchievements} onChange={e => setLearningAchievements(e.target.value)} placeholder="Mis. Berhasil menguasai teknik pernapasan freestyle dan mulai latihan backstroke." />
            </Field>
          </div>
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

function CoachProfile({ profile, onRefresh, onLogout, onAvatarChange }: { profile: ProfileData | null; onRefresh: () => void; onLogout: () => void; onAvatarChange?: (url: string) => void }) {
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
  const [, setPendingAvatarFile] = useState<File | null>(null);
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
  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from profile */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setPhotoView(false);
    try {
      const url = await upload.avatar(file);
      // Propagate new URL to parent so Shell header avatar also updates
      onAvatarChange?.(url);
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      toast.success("Foto profil diperbarui");
    } catch {
      toast.error("Gagal upload foto, coba lagi");
      setAvatarPreview(null);
      setPendingAvatarFile(null);
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
    const ok = await confirm({ title: "Hapus sertifikasi?", body: `Hapus "${s.title}"? Tindakan ini tidak bisa dibatalkan.`, confirmLabel: "Hapus", danger: true });
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
    // Any edit on an approved or rejected cert resets it to pending for re-approval
    const needsReapproval = editCertTarget.status === "approved" || editCertTarget.status === "rejected";
    const { error } = await supabase.from("certifications").update({
      name: certForm.title, issuer: certForm.issuer || null,
      valid_from: certForm.issued_at || null,
      valid_until: certForm.no_expiry ? null : (certForm.expires_at || null),
      ...(needsReapproval ? { status: "pending", reject_reason: null } : {}),
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
    }).eq("id", profile?.id ?? "");
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
    }).eq("id", profile?.id ?? "");
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
        {uploading && (
          <div className="mt-2 text-xs text-ink-mute font-semibold animate-pulse">Mengupload foto…</div>
        )}
      </Card>

      {/* ── Inline Profile form ── */}
      <Card>
        <SectionTitle>Profil Saya</SectionTitle>
        <div className="mt-4 space-y-4">
          <div className="text-xs font-bold text-ink-mute uppercase tracking-widest">Data Pribadi</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nama panggilan" hint="Opsional"><Input value={profileForm.nick_name} onChange={e => setProfileForm(f => ({ ...f, nick_name: e.target.value }))} placeholder="Mis. Kak Reza" /></Field>
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
          <Field label="Alamat" hint="Opsional"><Textarea rows={2} value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder="Mis. Jl. Anggrek No. 12, Bekasi" /></Field>

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
              <Field label="Bio / Deskripsi" hint="Opsional"><Textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} placeholder="Mis. Berpengalaman 5 tahun melatih renang anak usia dini dengan pendekatan bermain." /></Field>
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
          <Field label="Password baru"><Input type="password" placeholder="••••••••" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></Field>
          <Field label="Konfirmasi"><Input type="password" placeholder="••••••••" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></Field>
          <Btn variant="primary" size="md" onClick={changePassword} disabled={savingPwd}>{savingPwd ? "Menyimpan…" : "Simpan password baru"}</Btn>
        </div>
      </Card>

      {/* ── Cert modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setEditCertTarget(null); }} title={editCertTarget ? "Edit Sertifikasi" : "Tambah Sertifikasi"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setEditCertTarget(null); }}>Batal</Btn><Btn variant="primary" onClick={editCertTarget ? saveCertEdit : saveCert} disabled={savingCert}>{savingCert ? "Menyimpan…" : "Submit"}</Btn></>}>
        <div className="space-y-4">
          {editCertTarget?.status === "approved" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warn-50 border border-warn-200 text-xs text-warn-800">
              <Icon name="info" className="w-4 h-4 shrink-0 mt-0.5 text-warn-600" />
              Mengedit sertifikasi yang sudah disetujui akan mengembalikan statusnya ke <strong>Menunggu Persetujuan</strong> untuk direview ulang oleh admin.
            </div>
          )}
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
          <Field label="Nomor rekening" required><Input value={bankForm.bank_account} onChange={e => setBankForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="Mis. 1234567890" /></Field>
          <Field label="Atas nama" required><Input value={bankForm.bank_holder} onChange={e => setBankForm(f => ({ ...f, bank_holder: e.target.value }))} placeholder="Mis. Reza Fahlevi" /></Field>
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

// ── CoachPayslip ───────────────────────────────────────────────────────────────

interface CoachPayslipItem {
  id: string; period_label: string; gross_amount: number; deductions: number;
  net_amount: number; notes: string | null; status: string;
  published_at: string | null; created_at: string;
  branch?: { name: string } | null;
}

function CoachPayslip({ coachId }: { coachId: string }) {
  const supabase = createClient();
  const [payslips, setPayslips] = useState<CoachPayslipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const printSlip = (p: CoachPayslipItem) => {
    const w = window.open("", "_blank", "width=700,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Slip Gaji ${p.period_label}</title>
    <style>body{font-family:sans-serif;padding:32px;color:#0f172a;max-width:600px;margin:auto}
    h1{font-size:20px;font-weight:700;margin-bottom:2px}.sub{font-size:13px;color:#64748b;margin-bottom:24px}
    .section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:20px 0 6px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8fafc;border-radius:8px;padding:12px 16px;font-size:13px;line-height:2}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px}
    .total{display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:16px;border-top:2px solid #0f172a;margin-top:4px}
    .net{color:#166534}
    footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}
    </style></head><body>
    <h1>Slip Gaji Coach</h1>
    <div class="sub">${p.period_label} &nbsp;·&nbsp; ${p.branch?.name ?? "—"}</div>
    <div class="section">Informasi</div>
    <div class="grid">
      <div><b>Periode</b></div><div>${p.period_label}</div>
      <div><b>Cabang</b></div><div>${p.branch?.name ?? "—"}</div>
      <div><b>Diterbitkan</b></div><div>${p.published_at ? new Date(p.published_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : "—"}</div>
    </div>
    <div class="section">Rincian</div>
    <div class="row"><span>Gaji Kotor</span><span>Rp ${p.gross_amount.toLocaleString("id-ID")}</span></div>
    <div class="row"><span>Potongan</span><span>- Rp ${p.deductions.toLocaleString("id-ID")}</span></div>
    <div class="total"><span>Gaji Bersih</span><span class="net">Rp ${p.net_amount.toLocaleString("id-ID")}</span></div>
    ${p.notes ? `<div class="section">Catatan</div><p style="font-size:13px">${p.notes}</p>` : ""}
    <footer>Next Swimming School &nbsp;·&nbsp; Dicetak ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}</footer>
    </body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub="Slip gaji yang telah diterbitkan oleh owner.">Slip Gaji</SectionTitle>

      {loading ? (
        <Card className="!p-10 text-center text-ink-mute">Memuat data…</Card>
      ) : payslips.length === 0 ? (
        <Card className="!p-10 text-center">
          <Icon name="invoice" className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <div className="font-display font-bold text-ink">Belum ada slip gaji</div>
          <p className="text-sm text-ink-mute mt-1">Slip gaji akan muncul di sini setelah owner menerbitkannya.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payslips.map(p => (
            <div key={p.id} className="bg-white border border-line rounded-2xl overflow-hidden shadow-card">
              <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-paper-tint" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                <span className="w-10 h-10 rounded-xl bg-ok-50 text-ok-700 flex items-center justify-center shrink-0">
                  <Icon name="wallet" className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{p.period_label}</div>
                  <div className="text-xs text-ink-mute mt-0.5">{p.branch?.name ?? "—"} · {p.published_at ? new Date(p.published_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : "—"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-ok-700">{fmtIDR(p.net_amount)}</div>
                  <div className="text-xs text-ink-mute">Gaji Bersih</div>
                </div>
                <Icon name={expanded === p.id ? "chevronD" : "chevron"} className="w-4 h-4 text-ink-faint shrink-0 rotate-0" />
              </button>

              {expanded === p.id && (
                <div className="border-t border-line px-4 py-4 space-y-3 bg-paper-tint">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Gaji Kotor</div>
                      <div className="font-mono font-semibold">{fmtIDR(p.gross_amount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-faint uppercase tracking-widest font-bold mb-0.5">Potongan</div>
                      <div className="font-mono font-semibold text-danger-700">- {fmtIDR(p.deductions)}</div>
                    </div>
                    <div className="col-span-2 bg-ok-50 border border-ok-200 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ok-900">Gaji Bersih</span>
                      <span className="font-mono font-bold text-ok-700 text-base">{fmtIDR(p.net_amount)}</span>
                    </div>
                  </div>
                  {p.notes && (
                    <div className="text-sm text-ink-mute bg-white rounded-xl px-3 py-2 border border-line">{p.notes}</div>
                  )}
                  <Btn variant="outline" icon="print" size="sm" className="w-full" onClick={() => printSlip(p)}>
                    Cetak Slip Gaji
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
  const [initError, setInitError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [holidayClassIds, setHolidayClassIds] = useState<Set<string>>(new Set());
  const [clockedInIds, setClockedInIds] = useState<Set<string>>(new Set());
  const [coachBranches, setCoachBranches] = useState<{ branch_id: string; name: string; is_primary: boolean }[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>("");
  const [ownSpreadsheets, setOwnSpreadsheets] = useState<Map<string, string>>(new Map());
  const [classSpreadsheets, setClassSpreadsheets] = useState<Map<string, CoachSpreadsheetRow[]>>(new Map());

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("profiles")
      .select("id, full_name, nick_name, email, phone, gender, birth_date, specialization, bio, address, education_level, education_institution, bank_name, bank_account, bank_holder, avatar_url, is_profile_complete, suspend_until, suspend_reason")
      .eq("id", userId).single();
    if (error) return null;
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

  const loadSpreadsheets = useCallback(async (coachId: string, classIds: string[]) => {
    if (classIds.length === 0) return;
    // Own entries (for unfilled alert + modal pre-population)
    const { data: own } = await supabase
      .from("class_coach_spreadsheets")
      .select("class_id, spreadsheet_url")
      .eq("coach_id", coachId)
      .in("class_id", classIds);
    if (own) setOwnSpreadsheets(new Map(
      (own as { class_id: string; spreadsheet_url: string }[]).map(r => [r.class_id, r.spreadsheet_url])
    ));
    // All coaches' entries (for display in detail modal)
    const { data: all } = await supabase
      .from("class_coach_spreadsheets")
      .select("class_id, coach_id, spreadsheet_url, updated_at, coach:profiles(full_name)")
      .in("class_id", classIds);
    if (all) {
      const map = new Map<string, CoachSpreadsheetRow[]>();
      (all as (CoachSpreadsheetRow & { class_id: string })[]).forEach(r => {
        map.set(r.class_id, [...(map.get(r.class_id) ?? []), r]);
      });
      setClassSpreadsheets(map);
    }
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadClasses = useCallback(async (profileId: string) => {
    const { data, error } = await supabase.from("class_coaches").select("class:classes(id, name, schedule_days, time_start, time_end, capacity, enrolled, goals, description, class_type, spreadsheet_filled, spreadsheet_url, branch:branches(name, city, address), member_classes(member:members(id, profile:profiles(full_name, birth_date, phone, gender, address, health_notes))))").eq("coach_id", profileId);
    if (error || !data) return;
    const rows = data.map((d: Record<string, unknown>) => d.class as ClassRow).filter(Boolean);
    setClasses(rows);
    // Load today's holidays for these classes
    const classIds = rows.map((c) => c.id);
    if (classIds.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: hols } = await supabase.from("class_holidays").select("class_id").in("class_id", classIds).eq("holiday_date", today);
      if (hols) setHolidayClassIds(new Set((hols as { class_id: string }[]).map((h) => h.class_id)));
    }
    // Load spreadsheets for all classes this coach teaches
    await loadSpreadsheets(profileId, classIds);
  }, [supabase, loadSpreadsheets]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await loadProfile(u.id);
      if (!p) {
        setInitError("Data akun tidak ditemukan di database. Kemungkinan data telah direset. Silakan hubungi admin untuk membuat ulang akun Anda.");
        return;
      }
      loadClasses(p.id);
      // Load branches for this coach
      const { data: cbData } = await supabase
        .from("coach_branches")
        .select("branch_id, branches(name), is_primary")
        .eq("coach_id", p.id);
      if (cbData && cbData.length > 0) {
        const mapped = (cbData as { branch_id: string; branches: { name: string } | null; is_primary: boolean }[]).map(cb => ({
          branch_id: cb.branch_id,
          name: cb.branches?.name ?? cb.branch_id,
          is_primary: cb.is_primary,
        }));
        setCoachBranches(mapped);
        // Default to primary branch, or first, or fallback to auth metadata
        const primaryId = mapped.find(b => b.is_primary)?.branch_id ?? mapped[0]?.branch_id ?? (u.user_metadata?.branch_id as string ?? "");
        setActiveBranchId(primaryId);
      } else {
        // Fallback to auth metadata (pre-migration coaches)
        setActiveBranchId(u.user_metadata?.branch_id as string ?? "");
      }
    });
  }, [loadProfile, loadClasses, supabase]); // eslint-disable-line react-hooks/exhaustive-deps


  const coachId = profile?.id ?? "";
  const branchId = activeBranchId || (user?.user_metadata?.branch_id as string ?? "");

  const refreshClasses = useCallback(() => {
    if (coachId) loadClasses(coachId);
  }, [coachId, loadClasses]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isSuspended = profile?.suspend_until ? new Date(profile.suspend_until) >= new Date() : false;
  const isProfileComplete = profile?.is_profile_complete ?? true; // default true until profile loaded

  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const title = active === "home" ? (profile?.full_name ?? "Coach") : {
    absen: "Absensi", kelas: "Kelas", invoice: "Invoice", rapor: "Rapor", payslip: "Slip Gaji", profile: "Profile"
  }[active] ?? "";
  const sub = active === "home" ? `${todayName} · ${fmtDateLong(new Date())}` : {
    absen: "Clock-in & scan QR", kelas: "Kelas yang Anda handle",
    invoice: "Generate invoice bulanan", rapor: "Isi rapor member",
    payslip: "Slip gaji yang diterbitkan owner",
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
    ? (locked ? <LockedNotice feature="Clock-In" reason={lockReason} /> : <ClockInFlow back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} preselectedClassId={clockinClassId ?? undefined} onSuccess={(cid) => setClockedInIds(prev => new Set([...prev, cid]))} />)
    : overlay === "leave"
    ? <LeaveForm back={() => setOverlay(null)} coachId={coachId} branchId={branchId} classes={classes} />
    : overlay === "leave-history"
    ? <LeaveHistory back={() => setOverlay(null)} coachId={coachId} />
    : {
        home:    <>{SuspendBanner}{IncompleteBanner}<CoachHome setOverlay={setOverlay} setActive={(tab) => setActive(tab as TabId)} coachId={coachId} branchId={branchId} profile={profile} classes={classes} holidayClassIds={holidayClassIds} clockedInIds={clockedInIds} setClockedInIds={setClockedInIds} ownSpreadsheets={ownSpreadsheets} /></>,
        absen:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Absensi" reason={lockReason} /> : <CoachAbsensi setOverlay={setOverlay} coachId={coachId} branchId={branchId} classes={classes} holidayClassIds={holidayClassIds} clockedInIds={clockedInIds} />}</>,
        kelas:   <CoachKelas classes={classes} coachId={coachId} classSpreadsheets={classSpreadsheets} ownSpreadsheets={ownSpreadsheets} onRefreshClasses={refreshClasses} />,
        invoice: <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Invoice" reason={lockReason} /> : <CoachInvoice coachId={coachId} branchId={branchId} profile={profile} />}</>,
        rapor:   <>{SuspendBanner}{IncompleteBanner}{locked ? <LockedNotice feature="Rapor" reason={lockReason} /> : <CoachRapor coachId={coachId} branchId={branchId} />}</>,
        payslip: <CoachPayslip coachId={coachId} />,
        profile: <CoachProfile profile={profile} onRefresh={() => user && loadProfile(user.id)} onLogout={logout} onAvatarChange={url => setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)} />,
      }[active];

  if (initError) return (
    <div className="min-h-screen flex items-center justify-center bg-paper-tint px-4">
      <div className="bg-white rounded-2xl shadow-float border border-line p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 text-danger-500 flex items-center justify-center mx-auto">
          <Icon name="warning" className="w-7 h-7" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-ink">Data Tidak Ditemukan</h2>
          <p className="text-sm text-ink-mute mt-2 leading-relaxed">{initError}</p>
        </div>
        <Btn variant="primary" className="w-full" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}>
          Kembali ke Login
        </Btn>
      </div>
    </div>
  );

  return (
    <>
      <Shell active={active} onNav={(id) => { setOverlay(null); setActive(id); }} title={overlay ? "" : title} sub={overlay ? "" : sub} user={user} avatarUrl={profile?.avatar_url}
        branches={coachBranches.length > 1 ? coachBranches : undefined}
        activeBranchId={activeBranchId}
        onBranchChange={setActiveBranchId}>
        {content}
      </Shell>
    </>
  );
}
