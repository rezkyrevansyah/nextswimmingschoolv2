"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import Modal from "@/components/ui/Modal";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import type { AdminCoachHook } from "./_hook";

export default function CredentialAndCertModals({ hook }: { hook: AdminCoachHook }) {
  const {
    t, coachCredential, setCoachCredential,
    detail, openAddCert, setOpenAddCert, certForm, setCertForm, certPhotoFile, setCertPhotoFile, certPhotoInputRef, savingCert, addCert,
    photoView, setPhotoView,
  } = hook;

  return (
    <>
      {/* ── Coach credential popup ── */}
      <Modal open={!!coachCredential} onClose={() => setCoachCredential(null)} title={t("admin.coaches.credentialModalTitle")} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setCoachCredential(null)}>{t("common.actions.close")}</Btn>{coachCredential?.phone && <Btn variant="wa" icon="whatsapp" onClick={() => { const num = coachCredential.phone!.replace(/^0/, "").replace(/\D/g, ""); const msg = encodeURIComponent(t("admin.coaches.coachAccountCreatedWaMessage", { name: coachCredential.full_name, email: coachCredential.email, password: coachCredential.password })); window.open(`https://wa.me/62${num}?text=${msg}`, "_blank"); }}>{t("admin.coaches.sendViaWaBtn")}</Btn>}</>}>
        <div className="space-y-3">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-center gap-2 text-ok-700 font-semibold text-sm"><Icon name="check" className="w-4 h-4" />{t("admin.coaches.accountCreatedSuccessfully")}</div>
          </Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{t("admin.coaches.nameLabel")}</span>
              <span className="font-semibold text-sm">{coachCredential?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{t("admin.coaches.fieldEmail2")}</span>
              <span className="font-mono text-sm">{coachCredential?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{t("admin.coaches.fieldInitialPassword")}</span>
              <span className="font-mono text-sm bg-paper-deep px-2 py-0.5 rounded">{coachCredential?.password}</span>
            </div>
          </div>
          <p className="text-xs text-ink-mute">{t("admin.coaches.saveOrSendCredentialHint")}</p>
        </div>
      </Modal>

      {/* ── Add certification modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setCertPhotoFile(null); }} title={t("admin.coaches.addCertModalTitle", { name: detail?.full_name ?? "" })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setCertPhotoFile(null); }}>{t("common.actions.cancel")}</Btn><Btn variant="primary" onClick={addCert} disabled={savingCert}>{savingCert ? t("common.actions.saving") : t("common.actions.save")}</Btn></>}>
        <div className="space-y-4">
          <Field label={t("admin.coaches.fieldCertName")}><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder={t("admin.coaches.certNamePlaceholder")} /></Field>
          <Field label={t("admin.coaches.fieldIssuingInstitution")}><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder={t("admin.coaches.issuerPlaceholder2")} /></Field>
          <Field label={t("admin.coaches.validFromLabel")}><MonthYearPicker value={certForm.issued_at} onChange={v => setCertForm(f => ({ ...f, issued_at: v }))} placeholder={t("common.monthYearPicker.placeholder")} /></Field>
          <Field label={t("admin.coaches.validUntilLabel")}><MonthYearPicker value={certForm.expires_at} onChange={v => setCertForm(f => ({ ...f, expires_at: v }))} placeholder={t("common.monthYearPicker.placeholder")} disabled={certForm.no_expiry} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, no_expiry: e.target.checked, expires_at: "" }))} className="rounded" />
            {t("admin.approvement.noExpiryLabel")}
          </label>
          <div>
            <div className="text-sm font-semibold text-ink mb-1.5">{t("admin.coaches.certPhotoLabel")} <span className="text-ink-faint font-normal text-xs">{t("admin.coaches.certPhotoOptionalHint")}</span></div>
            {certPhotoFile && (
              <img src={URL.createObjectURL(certPhotoFile)} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => certPhotoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper-tint hover:bg-white hover:border-ocean-400 transition-colors text-sm font-semibold text-ink-soft hover:text-ink">
                <Icon name="camera" className="w-4 h-4" />
                {certPhotoFile ? t("common.photoLightbox.changePhoto") : t("admin.coaches.choosePhotoBtn")}
              </button>
              {certPhotoFile && <span className="text-sm text-ink-mute truncate max-w-[160px]">{certPhotoFile.name}</span>}
              <input ref={certPhotoInputRef} type="file" accept="image/*" className="sr-only" onChange={e => setCertPhotoFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </div>
      </Modal>

      {photoView && (
        <PhotoLightbox src={photoView} name={detail?.full_name ?? ""} onClose={() => setPhotoView(null)} />
      )}
    </>
  );
}
