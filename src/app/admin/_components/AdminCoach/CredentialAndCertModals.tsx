"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Input } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import Modal from "@/components/ui/Modal";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { AdminCoachHook } from "./_hook";

export default function CredentialAndCertModals({ hook }: { hook: AdminCoachHook }) {
  const {
    coachCredential, setCoachCredential,
    detail, openAddCert, setOpenAddCert, certForm, setCertForm, certPhotoFile, setCertPhotoFile, certPhotoInputRef, savingCert, addCert,
    photoView, setPhotoView,
  } = hook;

  return (
    <>
      {/* ── Coach credential popup ── */}
      <Modal open={!!coachCredential} onClose={() => setCoachCredential(null)} title={"Coach Account Created"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setCoachCredential(null)}>{"Close"}</Btn>{coachCredential?.phone && <Btn variant="wa" icon="whatsapp" onClick={() => { const num = coachCredential.phone!.replace(/^0/, "").replace(/\D/g, ""); const msg = encodeURIComponent(`Hi ${coachCredential.full_name}, your coach account has been created.

Email: ${coachCredential.email}
Password: ${coachCredential.password}

Please log in to the Next Swimming School app.`); window.open(`https://wa.me/62${num}?text=${msg}`, "_blank"); }}>{"Send via WA"}</Btn>}</>}>
        <div className="space-y-3">
          <Card className="!p-4 bg-ok-50 border-ok-200">
            <div className="flex items-center gap-2 text-ok-700 font-semibold text-sm"><Icon name="check" className="w-4 h-4" />{"Account created successfully"}</div>
          </Card>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{"Name"}</span>
              <span className="font-semibold text-sm"><NoTranslate>{coachCredential?.full_name}</NoTranslate></span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-line">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{"Email"}</span>
              <span className="font-mono text-sm"><NoTranslate>{coachCredential?.email}</NoTranslate></span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs text-ink-mute uppercase tracking-widest font-bold">{"Initial password"}</span>
              <span className="font-mono text-sm bg-paper-deep px-2 py-0.5 rounded"><NoTranslate>{coachCredential?.password}</NoTranslate></span>
            </div>
          </div>
          <p className="text-xs text-ink-mute">{"Save or send this credential to the coach. The password cannot be viewed again after this modal is closed."}</p>
        </div>
      </Modal>

      {/* ── Add certification modal ── */}
      <Modal open={openAddCert} onClose={() => { setOpenAddCert(false); setCertPhotoFile(null); }} title={(<>{"Add Certification — "}<NoTranslate>{detail?.full_name ?? ""}</NoTranslate></>)} size="sm"
        footer={<><Btn variant="ghost" onClick={() => { setOpenAddCert(false); setCertPhotoFile(null); }}>{"Cancel"}</Btn><Btn variant="primary" onClick={addCert} disabled={savingCert}>{savingCert ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-4">
          <Field label={"Certification name"}><Input value={certForm.title} onChange={e => setCertForm(f => ({ ...f, title: e.target.value }))} placeholder={"E.g. Advanced Freestyle Swimming"} /></Field>
          <Field label={"Issuing institution"}><Input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))} placeholder={"E.g. Swim Federation, FINA"} /></Field>
          <Field label={"Valid from"}><MonthYearPicker value={certForm.issued_at} onChange={v => setCertForm(f => ({ ...f, issued_at: v }))} placeholder={"Select month & year"} /></Field>
          <Field label={"Valid until"}><MonthYearPicker value={certForm.expires_at} onChange={v => setCertForm(f => ({ ...f, expires_at: v }))} placeholder={"Select month & year"} disabled={certForm.no_expiry} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
            <input type="checkbox" checked={certForm.no_expiry} onChange={e => setCertForm(f => ({ ...f, no_expiry: e.target.checked, expires_at: "" }))} className="rounded" />
            {"No expiry"}
          </label>
          <div>
            <div className="text-sm font-semibold text-ink mb-1.5">{"Certificate photo"} <span className="text-ink-faint font-normal text-xs">{"(optional, helps verification)"}</span></div>
            {certPhotoFile && (
              <img src={URL.createObjectURL(certPhotoFile)} alt="Preview" className="w-full max-h-36 object-cover rounded-xl border border-line mb-2" />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => certPhotoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper-tint hover:bg-white hover:border-ocean-400 transition-colors text-sm font-semibold text-ink-soft hover:text-ink">
                <Icon name="camera" className="w-4 h-4" />
                {certPhotoFile ? "Change Photo" : "Choose photo"}
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
