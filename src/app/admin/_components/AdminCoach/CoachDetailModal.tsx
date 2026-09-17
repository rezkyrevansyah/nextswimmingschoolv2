"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import Modal from "@/components/ui/Modal";
import { fmtDate, waLink } from "@/lib/utils";
import type { AdminCoachHook } from "./_hook";

export default function CoachDetailModal({ hook }: { hook: AdminCoachHook }) {
  const {
    t, monthsLong, genderLabel, branchId, fmtMonthYear,
    detail, setDetail, isSuspended, isArchived, coachStatus, setPhotoView,
    setEditForm, setEditAvatarFile, setEditAvatarPreview, setOpenEdit,
    setNewPassword, setOpenReset, liftSuspend, setSuspendTarget, setSuspendForm,
    toggleArchive, deleteCoach, calcAge, openAssignModal, unlinkCoachFromBranch,
    setCertForm, setCertPhotoFile, setOpenAddCert, deleteCert,
  } = hook;

  if (!detail) return null;

  const suspended = isSuspended(detail);
  const archived = isArchived(detail);
  const activeCerts = detail.certifications?.filter(ct => ct.status === "approved") ?? [];
  const allClasses = (detail.class_coaches ?? []).filter(cc => cc.class);
  const branchOrder = (detail.coach_branches ?? []).slice().sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  const byBranch = new Map<string, typeof allClasses>();
  for (const cc of allClasses) {
    const bid = cc.class!.branch_id;
    if (!byBranch.has(bid)) byBranch.set(bid, []);
    byBranch.get(bid)!.push(cc);
  }
  const isMultiBranch = (detail.coach_branches?.length ?? 0) > 1;

  return (
    <Modal
      size="xl"
      open={!!detail}
      onClose={() => setDetail(null)}
      title={t("admin.coaches.detailModalTitle")}
      footer={
        !archived ? (
          <>
            <Btn variant="outline" size="sm" icon="edit" onClick={() => { setEditForm({ full_name: detail.full_name, nick_name: detail.nick_name ?? "", gender: detail.gender ?? "", birth_date: detail.birth_date ?? "", phone: detail.phone ?? "", specialization: detail.specialization ?? "", bio: detail.bio ?? "", address: detail.address ?? "", education_level: detail.education_level ?? "", education_institution: detail.education_institution ?? "", bank_name: detail.bank_name ?? "", bank_account: detail.bank_account ?? "", bank_holder: detail.bank_holder ?? "" }); setEditAvatarFile(null); setEditAvatarPreview(null); setOpenEdit(true); }}>{t("admin.coaches.editDataBtn")}</Btn>
            <Btn variant="outline" size="sm" icon="lock" onClick={() => { setNewPassword(""); setOpenReset(true); }}>{t("admin.coaches.resetPasswordBtn")}</Btn>
            {suspended
              ? <Btn variant="soft" size="sm" icon="check" onClick={() => liftSuspend(detail)}>{t("admin.coaches.endSuspendBtn")}</Btn>
              : <Btn variant="ghost" size="sm" className="text-warn-600" onClick={() => { setSuspendTarget(detail); setSuspendForm({ reason: "", until: "" }); }}>{t("admin.coaches.suspendCoachBtn")}</Btn>
            }
            <Btn variant="ghost" size="sm" className="text-ink-mute" onClick={() => toggleArchive(detail)}>{t("admin.coaches.archiveBtn2")}</Btn>
          </>
        ) : (
          <>
            <Btn variant="soft" size="sm" icon="check" onClick={() => toggleArchive(detail)}>{t("admin.coaches.reactivateBtn")}</Btn>
            <Btn variant="ghost" size="sm" className="text-danger-600" onClick={() => deleteCoach(detail)}>{t("admin.coaches.deletePermanentlyBtn")}</Btn>
          </>
        )
      }
    >
      <div className="space-y-5">
        {/* Profile summary */}
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => detail.avatar_url && setPhotoView(detail.avatar_url)} className={detail.avatar_url ? "cursor-zoom-in shrink-0" : "cursor-default shrink-0"}>
            <Avatar name={detail.full_name} src={detail.avatar_url ?? undefined} size={64} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl text-ink">{detail.full_name}</div>
            {detail.specialization && <div className="text-sm text-ocean-700 font-semibold mt-0.5">{detail.specialization}</div>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Status kind={coachStatus(detail) as "active" | "suspended" | "archived"}>
                {archived ? t("admin.coaches.statusArchived") : suspended ? t("admin.coaches.statusSuspend") : t("admin.coaches.statusActive")}
              </Status>
              {activeCerts.length > 0 && <span className="text-xs text-ok-700 bg-ok-50 px-2 py-0.5 rounded-full font-semibold">{t("admin.coaches.certsCountBadge", { count: activeCerts.length })}</span>}
            </div>
          </div>
        </div>

        {/* Suspend banner */}
        {suspended && (
          <div className="p-3 rounded-xl bg-warn-50 border border-warn-200 space-y-1">
            <div className="flex items-center gap-2 text-warn-700 font-semibold text-sm"><Icon name="warning" className="w-4 h-4" />{t("admin.coaches.currentlySuspendedLabel")}</div>
            {detail.suspend_until && <div className="text-xs text-warn-600">{t("admin.coaches.endsLabel")}: {fmtDate(detail.suspend_until)}</div>}
            {detail.suspend_reason && <div className="text-xs text-warn-600">{t("admin.coaches.reasonLabel2")}: {detail.suspend_reason}</div>}
          </div>
        )}

        {/* Contact info */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.contactLabel")}</div>
          <div className="bg-paper-tint rounded-xl divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{t("admin.coaches.fieldEmail2")}</span>
              <span className="text-sm font-mono text-ink">{detail.email}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{t("admin.coaches.rowPhoneWa")}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink">{detail.phone ?? "—"}</span>
                {detail.phone && (
                  <a href={waLink(t("admin.coaches.welcomeWaMessage2", { name: detail.full_name }), detail.phone)} target="_blank" rel="noreferrer" className="text-ok-600 hover:text-ok-700">
                    <Icon name="whatsapp" className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Extra profile info */}
        {(detail.nick_name || detail.gender || detail.birth_date || detail.address || detail.education_level) && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.personalInfoLabel")}</div>
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              {detail.nick_name && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowNickname")}</span><span className="text-sm text-ink">{detail.nick_name}</span></div>}
              {detail.gender && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowGender2")}</span><span className="text-sm text-ink">{genderLabel(detail.gender)}</span></div>}
              {detail.birth_date && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowBirthDate2")}</span><span className="text-sm text-ink">{fmtDate(detail.birth_date)} ({t("admin.approvement.yearsSuffix", { n: calcAge(detail.birth_date) })})</span></div>}
              {detail.education_level && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{t("admin.coaches.rowEducation")}</span><span className="text-sm text-ink">{detail.education_level}{detail.education_institution ? ` — ${detail.education_institution}` : ""}</span></div>}
              {detail.address && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute shrink-0">{t("admin.coaches.rowAddress2")}</span><span className="text-sm text-ink text-right ml-4">{detail.address}</span></div>}
            </div>
          </div>
        )}

        {/* Assigned classes — grouped by branch */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.classesHandledLabel")}</div>
            {!archived && <button onClick={() => openAssignModal(detail)} className="text-xs text-ocean-600 font-semibold hover:underline">{t("admin.coaches.editAssignBtn")}</button>}
          </div>
          {allClasses.length === 0 ? (
            <div className="p-3 rounded-xl bg-warn-50 border border-warn-100 text-xs text-warn-700 flex items-center gap-2">
              <Icon name="warning" className="w-4 h-4 shrink-0" />{t("admin.coaches.notAssignedYet")}
            </div>
          ) : isMultiBranch ? (
            /* Multi-branch: group by branch */
            <div className="space-y-3">
              {branchOrder.map(cb => {
                const classes = byBranch.get(cb.branch_id) ?? [];
                const isCurrentBranch = cb.branch_id === branchId;
                return (
                  <div key={cb.branch_id} className="rounded-xl border border-line overflow-hidden">
                    <div className={`flex items-center gap-2 px-3 py-2 ${isCurrentBranch ? "bg-ocean-50" : "bg-paper-tint"}`}>
                      <Icon name="pin" className="w-3.5 h-3.5 text-ink-mute shrink-0" />
                      <span className="text-xs font-bold text-ink">{cb.branches?.name ?? cb.branch_id}</span>
                      {cb.branches?.city && <span className="text-xs text-ink-mute">· {cb.branches.city}</span>}
                      {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-100 px-1.5 py-0.5 rounded ml-auto">{t("admin.coaches.primaryBadge")}</span>}
                      {isCurrentBranch && !cb.is_primary && <span className="text-[10px] font-bold text-wave-700 bg-wave-50 px-1.5 py-0.5 rounded ml-auto">{t("admin.coaches.thisBranchBadge")}</span>}
                    </div>
                    {classes.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-ink-faint italic">{t("admin.coaches.noClassesInBranch")}</div>
                    ) : (
                      <div className="divide-y divide-line">
                        {classes.map(cc => (
                          <div key={cc.class_id} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-ocean-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
                                {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide shrink-0">{t("admin.classes.headRoleBtn")}</span>}
                              </div>
                              {cc.class?.schedule_days && (
                                <div className="text-xs text-ink-mute mt-0.5">
                                  {cc.class.schedule_days.join(", ")}{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single branch: flat list */
            <div className="space-y-2">
              {allClasses.map(cc => (
                <div key={cc.class_id} className="px-4 py-3 bg-paper-tint rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold text-sm text-ink">{cc.class?.name}</div>
                    {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide shrink-0">{t("admin.classes.headRoleBtn")}</span>}
                  </div>
                  {cc.class?.schedule_days && (
                    <div className="text-xs text-ink-mute mt-0.5">
                      {cc.class.schedule_days.join(", ")}{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branches summary */}
        {(detail.coach_branches?.length ?? 0) > 1 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.registeredBranchesLabel")}</div>
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              {detail.coach_branches!
                .slice()
                .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                .map(cb => {
                  const classCount = (detail.class_coaches ?? []).filter(cc => cc.class?.branch_id === cb.branch_id).length;
                  return (
                    <div key={cb.branch_id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className="text-sm text-ink font-semibold">{cb.branches?.name ?? cb.branch_id}</span>
                        {cb.branches?.city && <span className="text-xs text-ink-mute ml-1.5">{cb.branches.city}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-50 px-1.5 py-0.5 rounded">{t("admin.coaches.primaryBadge")}</span>}
                        <span className="text-xs text-ink-faint">{t("admin.coaches.classesCountSince", { count: classCount, date: fmtDate(cb.joined_at) })}</span>
                        {cb.branch_id === branchId && (
                          <button type="button" onClick={() => unlinkCoachFromBranch(detail, classCount)} className="p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors" title={t("admin.coaches.unlinkBtn")}>
                            <Icon name="unlink" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* QR & ID */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.qrCoachLabel")}</div>
          <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-xl">
            <QRBox value={(detail as unknown as { qr_code?: string }).qr_code ?? detail.id} size={100} downloadable />
            <div>
              <div className="text-xs text-ink-mute mb-1">{t("admin.coaches.coachIdLabel")}</div>
              <div className="font-mono text-sm font-bold text-ink bg-white px-2 py-1 rounded border border-line">{detail.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {detail.bio && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.bioLabel")}</div>
            <p className="text-sm text-ink leading-relaxed">{detail.bio}</p>
          </div>
        )}

        {/* Bank info */}
        {detail.bank_name && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.bankAccountLabel")}</div>
            <div className="px-4 py-3 bg-paper-tint rounded-xl text-sm">
              <div className="font-semibold text-ink">{detail.bank_name}</div>
              <div className="text-ink-mute">{detail.bank_account} · {t("admin.coaches.bankHolderPrefix")} {detail.bank_holder}</div>
            </div>
          </div>
        )}

        {/* Certifications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.coaches.certificationsLabel")}</div>
            {!archived && (
              <button onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false }); setCertPhotoFile(null); setOpenAddCert(true); }} className="text-xs text-ocean-600 font-semibold hover:underline">{t("admin.coaches.addShortBtn")}</button>
            )}
          </div>
          {(detail.certifications?.length ?? 0) === 0 ? (
            <div className="text-xs text-ink-mute italic">{t("admin.coaches.noCertsYet")}</div>
          ) : (
            <div className="space-y-2">
              {detail.certifications!.map((ct) => (
                <div key={ct.id} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                  <div>
                    <div className="font-semibold text-sm text-ink">{ct.title ?? ct.name}</div>
                    {ct.valid_from && <div className="text-xs text-ink-mute mt-0.5">{fmtMonthYear(ct.valid_from, monthsLong)}{ct.valid_until ? ` – ${fmtMonthYear(ct.valid_until, monthsLong)}` : ` ${t("admin.coaches.noExpiryShort")}`}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Status kind={ct.status === "approved" ? "active" : ct.status === "pending" ? "pending" : "inactive"}>
                      {ct.status === "approved" ? t("admin.coaches.certStatusActive") : ct.status === "pending" ? t("admin.coaches.certStatusReview") : t("common.status.rejected")}
                    </Status>
                    {!archived && (
                      <button type="button" onClick={() => deleteCert(ct.id)} className="p-1 rounded hover:bg-danger-50 text-danger-400 hover:text-danger-600 transition-colors">
                        <Icon name="x" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
