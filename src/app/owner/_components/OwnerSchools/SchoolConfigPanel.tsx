"use client";
import Image from "next/image";
import { useLocale } from "@/components/providers/LocaleProvider";
import Icon from "@/components/ui/Icon";
import { Switch } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useOwnerSchoolsData } from "./useOwnerSchoolsData";

type OwnerSchoolsDataHook = ReturnType<typeof useOwnerSchoolsData>;

export default function SchoolConfigPanel({ hook }: { hook: OwnerSchoolsDataHook }) {
  const { t } = useLocale();
  const {
    uploading, logoInputRef, selectedSchool, signatures, sigLoading,
    setSigForm, setSigFile, setShowSigModal,
    configForm, setConfigForm, configSaving,
    handleLogo, saveConfig, toggleSigActive, deleteSignature,
  } = hook;

  if (!selectedSchool) {
    return (
      <div className="flex-1 bg-paper rounded-2xl border border-line p-12 flex flex-col items-center justify-center text-ink-mute text-sm min-h-[360px]">
        <Icon name="book" className="w-10 h-10 text-ink-faint mb-2" />
        <span>{t("owner.schools.selectSchoolPrompt")}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-paper rounded-2xl border border-line p-6 space-y-6 shadow-xs">
      {/* Header */}
      <div className="border-b border-line pb-4">
        <h2 className="font-display font-bold text-xl text-ink">
          <NoTranslate>{selectedSchool.name}</NoTranslate>
        </h2>
        <p className="text-xs text-ink-mute mt-1">
          <NoTranslate>{selectedSchool.branch?.name ?? "Center"}</NoTranslate>. Logo and signatures print on student report card PDFs.
        </p>
      </div>

      {/* 1. School Logo */}
      <div className="space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
          SCHOOL LOGO
        </div>
        {selectedSchool.logo_url ? (
          <div className="p-4 border border-line rounded-xl bg-paper-deep flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 rounded-xl bg-white border border-line flex items-center justify-center overflow-hidden p-2 shadow-xs shrink-0">
              <Image src={selectedSchool.logo_url} alt="Logo" width={80} height={80} className="w-full h-full object-contain" />
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="text-xs text-ink-soft">
                {t("owner.schools.logoUpdated")}
              </div>
              <button
                type="button"
                disabled={uploading}
                onClick={() => logoInputRef.current?.click()}
                className="h-9 px-4 rounded-xl border border-line bg-paper hover:bg-paper-tint text-ink-soft text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
                <span>{uploading ? t("common.actions.saving") : t("owner.schools.uploadLogoBtn")}</span>
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogo(e, selectedSchool)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="h-[120px] rounded-xl border border-line bg-paper-deep flex flex-col items-center justify-center gap-1.5 text-center p-4">
              <Icon name="image" className="w-6 h-6 text-ink-faint" />
              <div className="text-sm font-semibold text-ink-soft">No logo yet</div>
              <div className="text-xs text-ink-mute max-w-sm">
                It prints at the top of every report card for this school.
              </div>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => logoInputRef.current?.click()}
              className="h-10 px-4 rounded-xl border border-line bg-paper hover:bg-paper-tint text-ink-soft text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="upload" className="w-4 h-4" />
              <span>{uploading ? t("common.actions.saving") : "Upload logo"}</span>
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogo(e, selectedSchool)}
            />
          </div>
        )}
      </div>

      {/* 2. School Signatures */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            SCHOOL SIGNATURES
          </div>
          {signatures.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSigForm({ id: "", name: "", title: "Principal", is_active: true });
                setSigFile(null);
                setShowSigModal(true);
              }}
              className="h-8 px-3 rounded-lg border border-line bg-paper hover:bg-paper-tint text-ink-soft text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span>{t("owner.schools.addSigBtn")}</span>
            </button>
          )}
        </div>

        {sigLoading ? (
          <div className="text-center py-6 text-ink-mute text-sm">{t("common.actions.saving")}</div>
        ) : signatures.length === 0 ? (
          <div className="space-y-2.5">
            <div className="h-[120px] rounded-xl border border-line bg-paper-deep flex flex-col items-center justify-center gap-1.5 text-center p-4">
              <Icon name="edit" className="w-6 h-6 text-ink-faint" />
              <div className="text-sm font-semibold text-ink-soft">No signature yet</div>
              <div className="text-xs text-ink-mute max-w-sm">
                Add the name, the title and the signature image of whoever signs for this school.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSigForm({ id: "", name: "", title: "Principal", is_active: true });
                setSigFile(null);
                setShowSigModal(true);
              }}
              className="h-10 px-4 rounded-xl border border-line bg-paper hover:bg-paper-tint text-ink-soft text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>Add signature</span>
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {signatures.map(sig => (
              <div
                key={sig.id}
                className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                  sig.is_active ? "border-ok-200 bg-ok-50/20 shadow-2xs" : "border-line bg-paper-deep"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-24 h-14 bg-white border border-line rounded-lg flex items-center justify-center p-1 shrink-0 shadow-2xs">
                    {sig.image_url && sig.image_url !== "pending" ? (
                      <img src={sig.image_url} alt="Sig" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                    ) : <span className="text-xs text-ink-mute">Pending</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setSigForm({ id: sig.id, name: sig.name, title: sig.title, is_active: sig.is_active }); setSigFile(null); setShowSigModal(true); }}
                      className="w-7 h-7 rounded-md border border-line bg-paper hover:bg-paper-tint text-ink-mute hover:text-ink flex items-center justify-center transition-colors cursor-pointer"
                      title={t("common.actions.edit")}
                    >
                      <Icon name="edit" className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSignature(sig)}
                      className="w-7 h-7 rounded-md border border-line bg-paper hover:bg-rose-50 text-ink-mute hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title={t("common.actions.delete")}
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-sm text-ink"><NoTranslate>{sig.name}</NoTranslate></div>
                  <div className="text-xs text-ink-mute font-medium"><NoTranslate>{sig.title}</NoTranslate></div>
                </div>

                <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={sig.is_active} onChange={() => toggleSigActive(sig)} />
                    <span className={`text-xs font-bold ${sig.is_active ? "text-ok-700" : "text-ink-mute"}`}>
                      {sig.is_active ? t("owner.schools.activeSigBadge") : t("owner.schools.inactiveSigBadge")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Signature Slots on the PDF */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            SIGNATURE SLOTS ON THE PDF
          </div>
          <button
            type="button"
            onClick={saveConfig}
            disabled={configSaving}
            className="h-8 px-3 rounded-lg bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            {configSaving ? t("owner.schools.savingConfigBtn") : t("owner.schools.saveConfigBtn")}
          </button>
        </div>

        <div className="space-y-2.5">
          {/* Slot 1: Coach */}
          <div className="p-3.5 rounded-xl border border-line bg-paper-tint flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink">Coach</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={configForm.coach_sig_title}
                onChange={e => setConfigForm(f => ({ ...f, coach_sig_title: e.target.value }))}
                placeholder={t("owner.schools.coachSigTitleField")}
                className="h-9 px-3 w-48 sm:w-56 rounded-lg border border-line bg-paper text-sm text-ink focus:outline-hidden focus:border-ocean-500"
              />
              <Switch checked={configForm.show_coach_sig} onChange={c => setConfigForm(f => ({ ...f, show_coach_sig: c }))} />
            </div>
          </div>

          {/* Slot 2: Head of NEXT */}
          <div className="p-3.5 rounded-xl border border-line bg-paper-tint flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink">Head of NEXT</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={configForm.head_sig_title}
                onChange={e => setConfigForm(f => ({ ...f, head_sig_title: e.target.value }))}
                placeholder={t("owner.schools.headSigTitleField")}
                className="h-9 px-3 w-48 sm:w-56 rounded-lg border border-line bg-paper text-sm text-ink focus:outline-hidden focus:border-ocean-500"
              />
              <Switch checked={configForm.show_head_sig} onChange={c => setConfigForm(f => ({ ...f, show_head_sig: c }))} />
            </div>
          </div>

          {/* Slot 3: School representative */}
          <div className="p-3.5 rounded-xl border border-line bg-paper-tint flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink">School representative</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={configForm.show_school_sig} onChange={c => setConfigForm(f => ({ ...f, show_school_sig: c }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
