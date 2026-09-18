"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import { Field, Textarea } from "@/components/ui/FormFields";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { fmtMonthYear } from "./_utils";
import type { useApprovementData } from "./useApprovementData";

type ApprovementDataHook = ReturnType<typeof useApprovementData>;

export default function CertificationModals({ hook }: { hook: ApprovementDataHook }) {
  const {
    monthsLong,
    detailCert, setDetailCert, rejectCertTarget, setRejectCertTarget, certRejectReason, setCertRejectReason,
    rejectingCert, confirmRejectCert, approveCert,
  } = hook;
  const detailCertPhotoUrl = useSignedUrl(detailCert?.photo_url);

  return (
    <>
      {/* ── Detail Sertifikasi Modal ────────────────────────────────────────── */}
      <Modal open={!!detailCert} onClose={() => setDetailCert(null)} title={"Certification Detail"} size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <Btn variant="ghost" className="text-danger-500" onClick={() => { setRejectCertTarget(detailCert!); setDetailCert(null); setCertRejectReason(""); }}>{"Reject"}</Btn>
            <Btn variant="primary" icon="check" className="ml-auto" onClick={() => { approveCert(detailCert!.id); setDetailCert(null); }}>{"Approve"}</Btn>
          </div>
        }>
        {detailCert && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-line">
              <Avatar name={detailCert.profile?.full_name ?? "?"} size={48} />
              <div>
                <div className="font-display font-bold text-ink"><NoTranslate>{detailCert.profile?.full_name}</NoTranslate></div>
                <Status kind="pending" className="mt-1">{"Awaiting verification"}</Status>
              </div>
            </div>
            <div className="divide-y divide-line">
              {([
                ["Certificate name", <NoTranslate key="cert_name">{detailCert.title ?? detailCert.name}</NoTranslate>],
                ["Issuer", detailCert.issuer ? <NoTranslate key="issuer">{detailCert.issuer}</NoTranslate> : "—"],
                ["Valid from", detailCert.valid_from ? fmtMonthYear(detailCert.valid_from, monthsLong) : "—"],
              ] as [string, React.ReactNode][]).map(([label, value]) => (
                <div key={label} className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm">
                  <span className="text-ink-mute">{label}</span>
                  <span className="text-ink font-medium break-words">{value}</span>
                </div>
              ))}
              <div className="py-2 grid grid-cols-[40%_1fr] gap-2 text-sm items-center">
                <span className="text-ink-mute">{"Valid until"}</span>
                {detailCert.no_expiry ? (
                  <span className="inline-flex items-center gap-1.5 text-ok-700 font-semibold">
                    <span className="w-4 h-4 rounded-full bg-ok-100 flex items-center justify-center shrink-0">
                      <Icon name="check" className="w-2.5 h-2.5 text-ok-600" strokeWidth={3} />
                    </span>
                    {"No expiry"}
                  </span>
                ) : (
                  <span className="text-ink font-medium">{detailCert.valid_until ? fmtMonthYear(detailCert.valid_until, monthsLong) : "—"}</span>
                )}
              </div>
            </div>
            {detailCertPhotoUrl && (
              <a href={detailCertPhotoUrl} target="_blank" rel="noreferrer" className="block">
                <img src={detailCertPhotoUrl} alt={"Certificate photo"} className="w-full rounded-xl object-cover max-h-64 border border-line" />
                <span className="text-xs text-ocean-600 mt-1 block text-center">{"Click to open full size"}</span>
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* ── Tolak Sertifikasi ──────────────────────────────────────────────── */}
      <Modal open={!!rejectCertTarget} onClose={() => setRejectCertTarget(null)} title={"Reject Certification"} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectCertTarget(null)}>{"Cancel"}</Btn><Btn variant="danger" onClick={confirmRejectCert} disabled={rejectingCert}>{rejectingCert ? "Rejecting…" : "Reject Certification"}</Btn></>}>
        <div className="space-y-4">
          {rejectCertTarget && (
            <div className="p-3 rounded-xl bg-paper-tint border border-line text-sm">
              <div className="font-semibold text-ink"><NoTranslate>{rejectCertTarget.title ?? rejectCertTarget.name}</NoTranslate></div>
              <div className="text-ink-mute"><NoTranslate>{rejectCertTarget.profile?.full_name}</NoTranslate></div>
            </div>
          )}
          <Field label={"Rejection reason"} required>
            <Textarea rows={3} value={certRejectReason} onChange={e => setCertRejectReason(e.target.value)} placeholder={"E.g. Certificate has expired, please update with the latest document."} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
