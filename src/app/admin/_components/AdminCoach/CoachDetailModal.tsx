"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import QRBox from "@/components/ui/QRBox";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate, waLink } from "@/lib/utils";
import type { AdminCoachHook } from "./_hook";

export default function CoachDetailModal({ hook }: { hook: AdminCoachHook }) {
  const {
    monthsLong, genderLabel, branchId, fmtMonthYear,
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
      title={"Coach Detail"}
      footer={
        !archived ? (
          <>
            <Btn variant="outline" size="sm" icon="edit" onClick={() => { setEditForm({ full_name: detail.full_name, nick_name: detail.nick_name ?? "", gender: detail.gender ?? "", birth_date: detail.birth_date ?? "", phone: detail.phone ?? "", specialization: detail.specialization ?? "", bio: detail.bio ?? "", address: detail.address ?? "", education_level: detail.education_level ?? "", education_institution: detail.education_institution ?? "", bank_name: detail.bank_name ?? "", bank_account: detail.bank_account ?? "", bank_holder: detail.bank_holder ?? "" }); setEditAvatarFile(null); setEditAvatarPreview(null); setOpenEdit(true); }}>{"Edit Data"}</Btn>
            <Btn variant="outline" size="sm" icon="lock" onClick={() => { setNewPassword(""); setOpenReset(true); }}>{"Reset Password"}</Btn>
            {suspended
              ? <Btn variant="soft" size="sm" icon="check" onClick={() => liftSuspend(detail)}>{"End Suspend"}</Btn>
              : <Btn variant="ghost" size="sm" className="text-warn-600" onClick={() => { setSuspendTarget(detail); setSuspendForm({ reason: "", until: "" }); }}>{"Suspend Coach"}</Btn>
            }
            <Btn variant="ghost" size="sm" className="text-ink-mute" onClick={() => toggleArchive(detail)}>{"Archive"}</Btn>
          </>
        ) : (
          <>
            <Btn variant="soft" size="sm" icon="check" onClick={() => toggleArchive(detail)}>{"Reactivate"}</Btn>
            <Btn variant="ghost" size="sm" className="text-danger-600" onClick={() => deleteCoach(detail)}>{"Delete Permanently"}</Btn>
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
            <div className="font-display font-bold text-xl text-ink"><NoTranslate>{detail.full_name}</NoTranslate></div>
            {detail.specialization && <div className="text-sm text-ocean-700 font-semibold mt-0.5"><NoTranslate>{detail.specialization}</NoTranslate></div>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Status kind={coachStatus(detail) as "active" | "suspended" | "archived"}>
                {archived ? "Archived" : suspended ? "Suspend" : "Active"}
              </Status>
              {activeCerts.length > 0 && <span className="text-xs text-ok-700 bg-ok-50 px-2 py-0.5 rounded-full font-semibold">{`${activeCerts.length} Certificates`}</span>}
            </div>
          </div>
        </div>

        {/* Suspend banner */}
        {suspended && (
          <div className="p-3 rounded-xl bg-warn-50 border border-warn-200 space-y-1">
            <div className="flex items-center gap-2 text-warn-700 font-semibold text-sm"><Icon name="warning" className="w-4 h-4" />{"Currently Suspended"}</div>
            {detail.suspend_until && <div className="text-xs text-warn-600">{"Ends"}: {fmtDate(detail.suspend_until)}</div>}
            {detail.suspend_reason && <div className="text-xs text-warn-600">{"Reason"}: <NoTranslate>{detail.suspend_reason}</NoTranslate></div>}
          </div>
        )}

        {/* Contact info */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Contact"}</div>
          <div className="bg-paper-tint rounded-xl divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{"Email"}</span>
              <span className="text-sm font-mono text-ink"><NoTranslate>{detail.email}</NoTranslate></span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{"Phone / WA"}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink"><NoTranslate>{detail.phone ?? "—"}</NoTranslate></span>
                {detail.phone && (
                  <a href={waLink(`Hi ${detail.full_name}, I'm from Next Swimming School admin.`, detail.phone)} target="_blank" rel="noreferrer" className="text-ok-600 hover:text-ok-700">
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
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Personal Info"}</div>
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              {detail.nick_name && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{"Nickname"}</span><span className="text-sm text-ink"><NoTranslate>{detail.nick_name}</NoTranslate></span></div>}
              {detail.gender && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{"Gender"}</span><span className="text-sm text-ink">{genderLabel(detail.gender)}</span></div>}
              {detail.birth_date && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{"Date of birth"}</span><span className="text-sm text-ink">{fmtDate(detail.birth_date)} ({`${calcAge(detail.birth_date)} y`})</span></div>}
              {detail.education_level && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute">{"Education"}</span><span className="text-sm text-ink"><NoTranslate>{detail.education_level}{detail.education_institution ? ` — ${detail.education_institution}` : ""}</NoTranslate></span></div>}
              {detail.address && <div className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-ink-mute shrink-0">{"Address"}</span><span className="text-sm text-ink text-right ml-4"><NoTranslate>{detail.address}</NoTranslate></span></div>}
            </div>
          </div>
        )}

        {/* Assigned classes — grouped by branch */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Classes Handled"}</div>
            {!archived && <button onClick={() => openAssignModal(detail)} className="text-xs text-ocean-600 font-semibold hover:underline">{"Edit Assign"}</button>}
          </div>
          {allClasses.length === 0 ? (
            <div className="p-3 rounded-xl bg-warn-50 border border-warn-100 text-xs text-warn-700 flex items-center gap-2">
              <Icon name="warning" className="w-4 h-4 shrink-0" />{"Not assigned to any class yet"}
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
                      <span className="text-xs font-bold text-ink"><NoTranslate>{cb.branches?.name ?? cb.branch_id}</NoTranslate></span>
                      {cb.branches?.city && <span className="text-xs text-ink-mute">· <NoTranslate>{cb.branches.city}</NoTranslate></span>}
                      {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-100 px-1.5 py-0.5 rounded ml-auto">{"Primary"}</span>}
                      {isCurrentBranch && !cb.is_primary && <span className="text-[10px] font-bold text-wave-700 bg-wave-50 px-1.5 py-0.5 rounded ml-auto">{"This center"}</span>}
                    </div>
                    {classes.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-ink-faint italic">{"No classes in this center"}</div>
                    ) : (
                      <div className="divide-y divide-line">
                        {classes.map(cc => (
                          <div key={cc.class_id} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-ocean-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-sm text-ink"><NoTranslate>{cc.class?.name}</NoTranslate></div>
                                {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide shrink-0">{"Head"}</span>}
                              </div>
                              {cc.class?.schedule_days && (
                                <div className="text-xs text-ink-mute mt-0.5">
                                  <NoTranslate>{cc.class.schedule_days.join(", ")}</NoTranslate>{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}
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
                    <div className="font-semibold text-sm text-ink"><NoTranslate>{cc.class?.name}</NoTranslate></div>
                    {cc.role === "head" && <span className="px-1.5 py-0.5 rounded-full bg-ocean-700 text-white text-[10px] font-bold uppercase tracking-wide shrink-0">{"Head"}</span>}
                  </div>
                  {cc.class?.schedule_days && (
                    <div className="text-xs text-ink-mute mt-0.5">
                      <NoTranslate>{cc.class.schedule_days.join(", ")}</NoTranslate>{cc.class.time_start ? ` · ${cc.class.time_start.slice(0,5)}${cc.class.time_end ? `–${cc.class.time_end.slice(0,5)}` : ""}` : ""}
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
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Registered Centers"}</div>
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              {detail.coach_branches!
                .slice()
                .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                .map(cb => {
                  const classCount = (detail.class_coaches ?? []).filter(cc => cc.class?.branch_id === cb.branch_id).length;
                  return (
                    <div key={cb.branch_id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className="text-sm text-ink font-semibold"><NoTranslate>{cb.branches?.name ?? cb.branch_id}</NoTranslate></span>
                        {cb.branches?.city && <span className="text-xs text-ink-mute ml-1.5"><NoTranslate>{cb.branches.city}</NoTranslate></span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {cb.is_primary && <span className="text-[10px] font-bold text-ocean-600 bg-ocean-50 px-1.5 py-0.5 rounded">{"Primary"}</span>}
                        <span className="text-xs text-ink-faint">{`${classCount} classes · Since ${fmtDate(cb.joined_at)}`}</span>
                        {cb.branch_id === branchId && (
                          <button type="button" onClick={() => unlinkCoachFromBranch(detail, classCount)} className="p-1 rounded hover:bg-danger-50 text-danger-500 transition-colors" title={"Unlink"}>
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
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Coach QR"}</div>
          <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-xl">
            <QRBox value={(detail as unknown as { qr_code?: string }).qr_code ?? detail.id} size={100} downloadable />
            <div>
              <div className="text-xs text-ink-mute mb-1">{"Coach ID"}</div>
              <div className="font-mono text-sm font-bold text-ink bg-white px-2 py-1 rounded border border-line">{detail.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {detail.bio && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Bio"}</div>
            <p className="text-sm text-ink leading-relaxed"><NoTranslate>{detail.bio}</NoTranslate></p>
          </div>
        )}

        {/* Bank info */}
        {detail.bank_name && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Bank Account"}</div>
            <div className="px-4 py-3 bg-paper-tint rounded-xl text-sm">
              <div className="font-semibold text-ink"><NoTranslate>{detail.bank_name}</NoTranslate></div>
              <div className="text-ink-mute"><NoTranslate>{detail.bank_account}</NoTranslate> · {"on behalf of"} <NoTranslate>{detail.bank_holder}</NoTranslate></div>
            </div>
          </div>
        )}

        {/* Certifications */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{"Certifications"}</div>
            {!archived && (
              <button onClick={() => { setCertForm({ title: "", issuer: "", issued_at: "", expires_at: "", no_expiry: false }); setCertPhotoFile(null); setOpenAddCert(true); }} className="text-xs text-ocean-600 font-semibold hover:underline">{"+ Add"}</button>
            )}
          </div>
          {(detail.certifications?.length ?? 0) === 0 ? (
            <div className="text-xs text-ink-mute italic">{"No certifications yet."}</div>
          ) : (
            <div className="space-y-2">
              {detail.certifications!.map((ct) => (
                <div key={ct.id} className="flex items-center justify-between px-4 py-3 bg-paper-tint rounded-xl">
                  <div>
                    <div className="font-semibold text-sm text-ink"><NoTranslate>{ct.title ?? ct.name}</NoTranslate></div>
                    {ct.valid_from && <div className="text-xs text-ink-mute mt-0.5">{fmtMonthYear(ct.valid_from, monthsLong)}{ct.valid_until ? ` – ${fmtMonthYear(ct.valid_until, monthsLong)}` : ` ${"· No expiry"}`}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Status kind={ct.status === "approved" ? "active" : ct.status === "pending" ? "pending" : "inactive"}>
                      {ct.status === "approved" ? "Active" : ct.status === "pending" ? "Review" : "Rejected"}
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
