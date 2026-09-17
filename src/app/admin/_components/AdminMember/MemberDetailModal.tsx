"use client";
import { createClient } from "@/utils/supabase/client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import { calcAge } from "../../_utils";
import type { ClassPackage } from "../../_types";
import type { AdminMemberHook } from "./_hook";
import MemberInfoTab from "./MemberInfoTab";
import MemberAttendanceTab from "./MemberAttendanceTab";
import MemberPaymentTab from "./MemberPaymentTab";
import MemberCompetitionTab from "./MemberCompetitionTab";

export default function MemberDetailModal({ hook }: { hook: AdminMemberHook }) {
  const {
    t, detail, closeDetail, detailTab, setDetailTab,
    attLoaded, loadAttendances, billsLoaded, loadBills, memberCompsLoaded, loadMemberComps,
    openEdit, setOpenResetPwd, setNewPwd,
    setAddSesiForm, setPrivateClassPackages, setOpenAddSesi,
    setSuspendMemberTarget, setSuspendMemberForm, liftSuspendMember, deleteMember,
  } = hook;

  const p = detail?.profile;
  const age = p?.birth_date ? calcAge(p.birth_date) : null;

  return (
    <Modal open={!!detail} onClose={closeDetail} title={detail?.profile?.full_name ?? ""} size="xl"
      footer={
        <>
          <Btn variant="ghost" onClick={closeDetail}>{t("common.actions.close")}</Btn>
          <Btn variant="outline" icon="edit" onClick={() => detail && openEdit(detail)}>{t("admin.coaches.editDataBtn")}</Btn>
          <Btn variant="outline" icon="refresh" onClick={() => { setOpenResetPwd(true); setNewPwd(""); }}>{t("admin.coaches.resetPasswordBtn")}</Btn>
          {detail?.type === "private" && (
            <Btn variant="accent" icon="plus" onClick={async () => {
              setAddSesiForm({ jumlah: "", generate_bill: false, selectedPackageId: "" });
              // Load packages for this member's private class
              const classId = detail.member_classes?.[0]?.class?.id;
              if (classId) {
                const db = createClient();
                const { data: pkgs } = await db.from("class_packages").select("id, name, sessions, price, sort_order, active").eq("class_id", classId).eq("active", true).order("sort_order");
                setPrivateClassPackages((pkgs ?? []) as ClassPackage[]);
              } else {
                setPrivateClassPackages([]);
              }
              setOpenAddSesi(true);
            }}>{t("admin.members.addSessionBtn")}</Btn>
          )}
          {detail?.status !== "suspended"
            ? <Btn variant="ghost" className="text-warn-600" onClick={() => { setSuspendMemberTarget(detail); setSuspendMemberForm({ reason: "", until: "" }); }}>{t("admin.members.suspendBtn2")}</Btn>
            : <Btn variant="soft" size="sm" icon="check" onClick={() => detail && liftSuspendMember(detail)}>{t("admin.coaches.endSuspendBtn")}</Btn>
          }
          <Btn variant="ghost" className="text-danger-500" icon="trash" onClick={() => detail && deleteMember(detail)}>{t("admin.coaches.deletePermanentlyBtn")}</Btn>
        </>
      }>
      {detail && (
        <div className="grid md:grid-cols-3 gap-5">
          {/* Left: avatar + QR */}
          <div className="text-center">
            <div className="flex justify-center">
              <button type="button" onClick={() => p?.avatar_url && hook.setPhotoView(p.avatar_url)} className={p?.avatar_url ? "cursor-zoom-in" : "cursor-default"}>
                <Avatar name={p?.full_name ?? ""} src={p?.avatar_url ?? undefined} size={96} />
              </button>
            </div>
            <div className="font-display font-bold text-lg text-ink mt-3">{p?.full_name ?? "—"}</div>
            {age && <div className="text-xs text-ink-mute">{t("admin.members.yearsOldSuffix", { n: age })}</div>}
            <div className="mt-4 flex justify-center"><QRBox value={detail.qr_code ?? detail.id} size={120} /></div>
            <div className="text-[9px] text-ink-faint font-mono mt-1 break-all">{detail.qr_code ?? detail.id}</div>
            {p?.phone ? (
              <a href={`https://wa.me/62${p.phone.replace(/^0/, "").replace(/\D/g, "")}?text=${encodeURIComponent(t("admin.members.waGreetingPrefix", { name: p.full_name }))}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex">
                <Btn variant="wa" size="sm" icon="whatsapp">{t("admin.members.contactMemberBtn")}</Btn>
              </a>
            ) : (
              <div className="mt-3 text-xs text-ink-faint">{t("admin.members.phoneNotAvailable")}</div>
            )}
          </div>

          {/* Right: tabbed detail */}
          <div className="md:col-span-2 space-y-4 text-sm">
            {/* Tab bar */}
            <div className="flex gap-1 bg-paper-tint rounded-xl p-1">
              {([["info", t("admin.members.tabInfo")], ["absensi", t("admin.members.tabAttendance2")], ["pembayaran", t("admin.members.tabPayment2")], ["lomba", "Prestasi & Lomba"]] as const).map(([id, label]) => (
                <button key={id} type="button"
                  onClick={() => {
                    setDetailTab(id);
                    if (id === "absensi" && !attLoaded) loadAttendances(detail.id);
                    if (id === "pembayaran" && !billsLoaded) loadBills(detail.id);
                    if (id === "lomba" && !memberCompsLoaded) loadMemberComps(detail.id);
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${detailTab === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
                  {label}
                </button>
              ))}
            </div>

            {detailTab === "info" && <MemberInfoTab hook={hook} />}
            {detailTab === "absensi" && <MemberAttendanceTab hook={hook} />}
            {detailTab === "pembayaran" && <MemberPaymentTab hook={hook} />}
            {detailTab === "lomba" && <MemberCompetitionTab hook={hook} />}
          </div>
        </div>
      )}
    </Modal>
  );
}
