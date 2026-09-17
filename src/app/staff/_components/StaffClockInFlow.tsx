"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function StaffClockInFlow({
  onCancel,
  onConfirm,
  loading
}: {
  onCancel: () => void;
  onConfirm: (photo: File) => void;
  loading: boolean;
}) {
  const { t } = useLocale();
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-paper anim-in">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line bg-white">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-paper-tint text-ink transition-colors">
          <Icon name="arrow-left" className="w-5 h-5" />
        </button>
        <div>
          <div className="font-display font-bold text-ink leading-tight">{t("staff.actions.clockInSelfieTitle")}</div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint mt-0.5">{t("staff.actions.clockInSelfieSub")}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          {!photoFile ? (
            <div className="aspect-[3/4] rounded-3xl bg-paper-tint border-2 border-dashed border-line flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-wave-50 text-wave-600 flex items-center justify-center mb-4">
                <Icon name="camera" className="w-8 h-8" />
              </div>
              <div className="font-display font-bold text-lg text-ink mb-2">{t("staff.actions.selfiePromptTitle")}</div>
              <p className="text-sm text-ink-mute mb-6">{t("staff.actions.selfiePromptBody")}</p>

              <label className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-wave-600 hover:bg-wave-700 text-white font-semibold cursor-pointer transition-colors shadow-lg shadow-wave-500/20">
                <Icon name="camera" className="w-5 h-5" /> {t("staff.actions.openCameraBtn")}
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleCapture} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from camera capture */}
              <img src={URL.createObjectURL(photoFile)} alt="selfie preview" className="w-full aspect-[3/4] object-cover rounded-3xl shadow-lg" />
              <div className="grid grid-cols-2 gap-3">
                <label className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white border border-line hover:bg-paper-tint text-ink font-semibold cursor-pointer transition-colors">
                  <Icon name="refresh" className="w-4 h-4" /> {t("staff.actions.retakeBtn")}
                  <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleCapture} />
                </label>
                <Btn variant="primary" className="h-11 shadow-lg shadow-ocean-500/20" disabled={loading || !photoFile} onClick={() => photoFile && onConfirm(photoFile)}>
                  {loading ? t("staff.home.clockInProcessing") : t("staff.actions.confirmBtn")}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
