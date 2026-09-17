"use client";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Select } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Status from "@/components/ui/Status";
import { useToast } from "@/components/providers/ToastProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { toLocalDateStr } from "@/lib/utils";
import {
  minutesAfterStart,
  classifyCoachClockIn,
  isUniqueViolation,
} from "@/lib/attendance";
import { createClient } from "@/utils/supabase/client";
import { useUpload } from "@/hooks/useUpload";
import { haversineMeters } from "../_utils";
import type { ClassRow } from "../_types";

export default function ClockInFlow({ back, coachId, branchId, classes, preselectedClassId, onSuccess }: {
  back: () => void;
  coachId: string; branchId: string;
  classes: ClassRow[];
  preselectedClassId?: string;
  onSuccess?: (classId: string) => void;
}) {
  const toast = useToast();
  const { upload, uploading } = useUpload();
  const supabase = createClient();
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const isPreselected = !!preselectedClassId;
  // If preselected, lock to that class. Otherwise default to first today's class.
  const todayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
  const todayClasses = classes.filter(c =>
    (c.schedule_days ?? []).includes(todayName) &&
    (!branchId || !c.branch_id || c.branch_id === branchId)
  );
  const [classId, setClassId] = useState(
    preselectedClassId ?? todayClasses[0]?.id ?? classes[0]?.id ?? ""
  );
  const [gpsStatus, setGpsStatus] = useState<"checking" | "ok" | "error">("checking");
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [branchCoords, setBranchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedClass = classes.find(c => c.id === classId) ?? null;
  const isExternalLocation = selectedClass?.location_type === "external";

  // Load the coordinates to compare GPS against. For a branch-tied class this
  // is that class's own assigned branch (not necessarily the coach's currently
  // active branch tab, if they cover more than one branch). For an external
  // location it's the pinned lat/lng captured on that class, so a change of
  // lesson location always takes effect on the very next clock-in.
  const classBranchId = selectedClass?.branch_id;
  const customLat = selectedClass?.custom_location_lat;
  const customLng = selectedClass?.custom_location_lng;
  /* eslint-disable react-hooks/set-state-in-effect -- derived state from selected class's own location fields */
  useEffect(() => {
    if (isExternalLocation) {
      setBranchCoords(customLat != null && customLng != null ? { lat: customLat, lng: customLng } : null);
      return;
    }
    const targetBranchId = classBranchId || branchId;
    if (!targetBranchId) { setBranchCoords(null); return; }
    supabase.from("branches").select("lat, lng").eq("id", targetBranchId).single()
      .then(({ data }) => { if (data?.lat && data?.lng) setBranchCoords({ lat: data.lat, lng: data.lng }); });
  }, [branchId, classBranchId, customLat, customLng, supabase, isExternalLocation]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    if (!classId) return toast.error(t("coach.clockIn.selectClassFirst"));
    if (!photoFile) return toast.error(t("coach.clockIn.selfieRequiredTitle"), t("coach.clockIn.selfieRequiredBody"));
    setSubmitting(true);
    const today = toLocalDateStr();
    const nowTime = new Date().toTimeString().slice(0, 8);

    // Determine late status: coach late if > 15 minutes after class start
    const selectedClass = classes.find(c => c.id === classId);
    const lateMinutes = selectedClass?.time_start ? minutesAfterStart(nowTime, selectedClass.time_start) : 0;
    const coachStatus = classifyCoachClockIn(lateMinutes);

    let selfieUrl: string;
    try {
      selfieUrl = await upload.selfie(photoFile, classId, today);
    } catch {
      setSubmitting(false);
      toast.error(t("coach.clockIn.selfieUploadFailedTitle"), t("coach.clockIn.selfieUploadFailedBody"));
      return;
    }

    // Check for existing attendance on same class + date before inserting
    const { data: existing } = await supabase.from("coach_attendances")
      .select("id").eq("coach_id", coachId).eq("class_id", classId).eq("session_date", today).maybeSingle();
    if (existing) {
      setSubmitting(false);
      toast.error(t("coach.clockIn.alreadyClockedInTitle"), t("coach.clockIn.alreadyClockedInBody"));
      return;
    }

    const { error } = await supabase.from("coach_attendances").insert({
      branch_id: branchId, coach_id: coachId, class_id: classId,
      session_date: today, clock_in_time: nowTime,
      status: coachStatus, is_manual: false,
      selfie_url: selfieUrl,
      distance_meters: distanceMeters,
    });

    setSubmitting(false);
    if (error) {
      const isDuplicate = isUniqueViolation(error.message);
      if (isDuplicate) { toast.error(t("coach.clockIn.alreadyClockedInTitle"), t("coach.clockIn.alreadyClockedInBody")); return; }
      toast.error(t("coach.clockIn.saveAttendanceFailedTitle"), error.message);
      return;
    }
    if (coachStatus === "late") {
      toast.error(t("coach.clockIn.attendanceRecordedLateTitle"), t("coach.clockIn.attendanceRecordedLateBody", { minutes: lateMinutes }));
    } else {
      toast.success(t("coach.clockIn.attendanceSuccessTitle"), t("coach.clockIn.attendanceSuccessBody"));
    }
    onSuccess?.(classId);
    setStep(3);
  };

  const distLabel = distanceMeters != null
    ? distanceMeters < 1000
      ? t("coach.clockIn.distFromBranchMeters", { m: distanceMeters })
      : t("coach.clockIn.distFromBranchKm", { km: (distanceMeters / 1000).toFixed(1) })
    : branchCoords == null
      ? (isExternalLocation ? t("coach.clockIn.externalLocationNote") : t("coach.clockIn.branchCoordsNotSet"))
      : t("coach.clockIn.calculatingDistance");

  const distColor = distanceMeters == null ? "text-ink-mute"
    : distanceMeters <= 500 ? "text-ok-600"
    : distanceMeters <= 2000 ? "text-warn-600"
    : "text-danger-600";

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <button onClick={back} className="text-sm text-ink-mute hover:text-ocean-600 font-semibold inline-flex items-center gap-1">
        <Icon name="arrowL" className="w-4 h-4" /> {t("coach.clockIn.backBtn")}
      </button>
      {step === 0 && (
        <Card className="anim-in">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-wave-50 text-wave-600 mx-auto flex items-center justify-center mb-3"><Icon name="camera" className="w-10 h-10" /></div>
            <h2 className="font-display font-bold text-xl text-ink">{t("coach.clockIn.clockInTitle")}</h2>
          </div>
          {isPreselected ? (
            <div className="rounded-xl bg-paper-tint border border-line px-4 py-3">
              <div className="text-xs text-ink-mute mb-0.5">{t("coach.clockIn.fieldClassLabel")}</div>
              <div className="font-semibold text-ink">{selectedClass?.name ?? "—"}</div>
              {selectedClass && (
                <div className="text-xs text-ink-mute mt-0.5">
                  {selectedClass.time_start?.slice(0, 5)}{selectedClass.time_end ? `–${selectedClass.time_end.slice(0, 5)}` : ""}
                </div>
              )}
            </div>
          ) : (
            <Field label={t("coach.clockIn.selectClassLabel")} required>
              <Select value={classId} onChange={e => setClassId(e.target.value)}>
                {(todayClasses.length > 0 ? todayClasses : classes).map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.time_start?.slice(0,5)}{c.time_end ? `–${c.time_end.slice(0,5)}` : ""}</option>
                ))}
              </Select>
            </Field>
          )}
          <Card className="!p-3 mt-4 bg-paper-tint">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-ink-faint font-bold uppercase tracking-widest mb-0.5">{t("coach.clockIn.gpsLabel")}</div>
                <div className={`font-semibold ${gpsStatus === "ok" ? "text-ok-600" : gpsStatus === "error" ? "text-danger-500" : "text-warn-600"}`}>
                  {gpsStatus === "ok" ? t("coach.clockIn.gpsDetected") : gpsStatus === "error" ? t("coach.clockIn.gpsFailed") : t("coach.clockIn.gpsDetecting")}
                </div>
              </div>
              <div>
                <div className="text-ink-faint font-bold uppercase tracking-widest mb-0.5">{isExternalLocation ? (branchCoords == null ? t("coach.clockIn.sessionLocationLabel") : t("coach.clockIn.distToLocationLabel")) : t("coach.clockIn.distToBranchLabel")}</div>
                <div className={`font-semibold ${distColor}`}>{distLabel}</div>
              </div>
            </div>
          </Card>
          <label className="block mt-4">
            <div className="w-full px-5 py-3 bg-ocean-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-ocean-800 transition">
              <Icon name="camera" className="w-4 h-4" /> {t("coach.clockIn.openSelfieCameraBtn")}
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
              <Status kind={gpsStatus === "ok" ? "active" : "inactive"} className="ml-auto">{gpsStatus === "ok" ? t("coach.clockIn.gpsOkBadge") : t("coach.clockIn.noGpsBadge")}</Status>
            </div>
            {coords && (
              <div className="text-[11px] text-ink-faint font-mono">
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </div>
            )}
          </Card>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <label>
              <Btn variant="outline" size="lg" icon="refresh" className="w-full pointer-events-none">{t("coach.clockIn.retakeBtn")}</Btn>
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={handleCapture} />
            </label>
            <Btn variant="primary" size="lg" onClick={submit} disabled={submitting || uploading}>{submitting || uploading ? t("coach.leave.sendingBtn") : t("coach.clockIn.submitBtn")}</Btn>
          </div>
        </Card>
      )}
      {step === 3 && (
        <Card className="anim-in text-center">
          <div className="w-20 h-20 rounded-full bg-ok-50 text-ok-600 mx-auto flex items-center justify-center mb-3"><Icon name="check" className="w-10 h-10" strokeWidth={3} /></div>
          <h2 className="font-display font-bold text-xl text-ink">{t("coach.clockIn.attendanceSuccessTitle")}</h2>
          <p className="text-ink-mute text-sm mt-1">{t("coach.clockIn.scanQrHint")}</p>
          {distanceMeters != null && (
            <p className={`text-sm font-semibold mt-1 ${distColor}`}>{distLabel}</p>
          )}
          <div className="mt-5">
            <Btn variant="outline" size="lg" className="w-full" onClick={back}>{t("coach.clockIn.backToHomeBtn")}</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
