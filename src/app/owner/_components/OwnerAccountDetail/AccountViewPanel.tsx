"use client";
import Image from "next/image";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import Status from "@/components/ui/Status";
import QRBox from "@/components/ui/QRBox";
import { SectionLabel } from "@/components/ui/FormFields";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import { ROLE_COLORS } from "./_types";
import InfoRow from "./InfoRow";
import AccountSecuritySection from "./AccountSecuritySection";
import type { useAccountDetailData } from "./useAccountDetailData";

type AccountDetailDataHook = ReturnType<typeof useAccountDetailData>;

export default function AccountViewPanel({ hook }: { hook: AccountDetailDataHook }) {
  const {
    t, ROLE_LABELS, account,
    coachClasses, certifications, memberData, downloadingQr, linkedStaff,
    copyToClipboard, handleDownloadSingleQR, calcAge,
  } = hook;
  if (!account) return null;

  const roleLabel = ROLE_LABELS[account.role] ?? account.role;
  const isKnownRole = account.role in ROLE_LABELS;
  const roleColor = ROLE_COLORS[account.role] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const displayName = account.full_name?.trim() || account.email?.split("@")[0] || roleLabel || "—";
  const activeQR = memberData?.qr_code || memberData?.member_no || account.qr_code || account.user_no || account.id;

  // Personal + bank data source: the linked Staff account when one exists
  // (see linkedStaff state above), otherwise this account's own row.
  const personalSource = linkedStaff ?? account;
  const age = calcAge(personalSource.birth_date);

  return (
    <div className="space-y-5">
      {/* Top: Header Info */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {account.avatar_url ? (
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-line shadow-sm">
              <Image src={account.avatar_url} alt={displayName} fill className="object-cover" />
            </div>
          ) : (
            <Avatar name={displayName} size={64} className="rounded-2xl text-lg" />
          )}
          {account.is_archived && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full flex items-center justify-center shadow"
              title={t("owner.accountDetail.inactiveTitleAttr")}
            >
              <Icon name="x" className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-xl text-ink">
              <NoTranslate>{displayName}</NoTranslate>
            </h3>
            {account.is_archived ? (
              <Status kind="archived">{t("owner.accountDetail.inactiveBadge")}</Status>
            ) : (
              <Status kind="active">{t("owner.accountDetail.activeBadge")}</Status>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${roleColor}`}
            >
              {isKnownRole ? roleLabel : <NoTranslate>{roleLabel}</NoTranslate>}
              {account.custom_role_label && !account.custom_role_label.includes("@") && (
                <>
                  {" · "}
                  <NoTranslate>{account.custom_role_label}</NoTranslate>
                </>
              )}
            </span>
            {(memberData?.member_no || account.user_no) && (
              <span className="font-mono text-xs font-bold text-ocean-700 bg-ocean-50 px-2.5 py-0.5 rounded-lg border border-ocean-200">
                <NoTranslate>{memberData?.member_no || account.user_no}</NoTranslate>
              </span>
            )}
          </div>
          <div className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span>{t("owner.accountDetail.registeredOn", { date: fmtDate(account.created_at) })}</span>
            {account.branch?.name && (
              <>
                <span>·</span>
                <span className="font-medium text-ink-soft">
                  <NoTranslate>{account.branch.name}</NoTranslate>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Compact identity strip (QR + ID) ── */}
      <div className="flex items-center gap-3">
        <div
          className="shrink-0"
          title={t("owner.accountDetail.qrUsageHint")}
        >
          <QRBox value={activeQR} size={56} hideCaption />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            {t("owner.accountDetail.idLabel")}
          </div>
          <div
            className="font-mono text-sm font-semibold text-ink truncate"
            title={activeQR}
          >
            <NoTranslate>{activeQR}</NoTranslate>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Btn
            variant="ghost"
            size="sm"
            icon="copy"
            onClick={() => copyToClipboard(activeQR, t("owner.accountDetail.qrCodeCopyLabel"))}
            title={t("owner.accountDetail.copyCodeBtn")}
          />
          <Btn
            variant="ghost"
            size="sm"
            icon="download"
            onClick={handleDownloadSingleQR}
            disabled={downloadingQr}
            title={t("owner.accountDetail.downloadIdCardTitleAttr")}
          />
        </div>
      </div>

      {/* Member Specific Stats & Classes */}
      {account.role === "member" && memberData && (
        <div>
          <SectionLabel sub={t("owner.accountDetail.membershipTypeLabel", { type: memberData.type })}>
            {t("owner.accountDetail.membershipDetailsTitle")}
          </SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center">
              <div className="text-[10px] text-ink-faint uppercase font-bold">{t("owner.accountDetail.fieldRemainingSessions")}</div>
              <div className="text-xl font-bold font-mono text-ocean-700">
                {memberData.remaining_sessions ?? "—"}
              </div>
            </div>
            <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center">
              <div className="text-[10px] text-ink-faint uppercase font-bold">{t("owner.accountDetail.fieldTotalSessions")}</div>
              <div className="text-xl font-bold font-mono text-ink">
                {memberData.total_sessions ?? "—"}
              </div>
            </div>
            <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center col-span-2 sm:col-span-2">
              <div className="text-[10px] text-ink-faint uppercase font-bold">{t("owner.accountDetail.schoolAffiliateLabel")}</div>
              <div className="text-sm font-semibold text-ink truncate mt-0.5">
                {memberData.school?.name ? (
                  <NoTranslate>{memberData.school.name}</NoTranslate>
                ) : (
                  t("owner.accountDetail.nonAffiliatedFallback")
                )}
              </div>
              {memberData.school_grade && (
                <div className="text-xs text-ink-mute mt-0.5">
                  {t("owner.accounts.fieldSchoolGrade")}: <NoTranslate>{memberData.school_grade}</NoTranslate>
                </div>
              )}
            </div>
          </div>

          {/* Enrolled classes */}
          {memberData.member_classes && memberData.member_classes.length > 0 && (
            <div className="pt-2 mt-2.5 border-t border-line/60">
              <div className="text-[11px] font-bold text-ink-mute mb-1.5">{t("owner.accountDetail.enrolledClasses")}</div>
              <div className="flex flex-wrap gap-1.5">
                {memberData.member_classes.map((mc, idx) => (
                  <span
                    key={mc.class?.id || idx}
                    className="bg-paper-tint px-2.5 py-1 rounded-lg border border-line/60 text-xs font-semibold text-ink-soft"
                  >
                    🏊 <NoTranslate>{mc.class?.name}</NoTranslate>{" "}
                    {mc.class?.time_start && (
                      <span className="font-normal text-ink-mute text-[11px]">
                        ({mc.class.time_start} - {mc.class.time_end})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coach Specific Classes & Certifications */}
      {account.role === "coach" && (
        <div>
          <SectionLabel>{t("owner.accountDetail.coachClassesAndCerts")}</SectionLabel>
          {coachClasses.length > 0 ? (
            <div>
              <div className="text-[11px] font-bold text-ink-mute mb-1.5">{t("owner.accountDetail.classesTaught")}</div>
              <div className="flex flex-wrap gap-1.5">
                {coachClasses.map((c) => (
                  <span
                    key={c.id}
                    className="bg-paper-tint px-2.5 py-1 rounded-lg border border-line/60 text-xs font-semibold text-ink-soft"
                  >
                    ⏱️ <NoTranslate>{c.name}</NoTranslate>{" "}
                    {c.branch?.name && (
                      <span className="font-normal text-ink-mute text-[11px]">
                        · <NoTranslate>{c.branch.name}</NoTranslate>
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-mute italic">No swimming classes assigned yet.</p>
          )}

          {certifications.length > 0 && (
            <div className="pt-2 mt-2.5 border-t border-line/60">
              <div className="text-[11px] font-bold text-ink-mute mb-1.5">Official Certifications:</div>
              <div className="flex flex-wrap gap-1.5">
                {certifications.map((cert) => (
                  <span
                    key={cert.id}
                    className="bg-paper-tint px-2.5 py-1 rounded-lg border border-line/60 text-xs font-semibold text-ink-soft"
                  >
                    📜 <NoTranslate>{cert.title || cert.name}</NoTranslate>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact & personal info */}
      <div>
      <SectionLabel>{t("owner.accountDetail.contactPersonalSection")}</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-3">
        <InfoRow
          icon="mail"
          label={t("owner.accountDetail.emailLabel")}
          value={<NoTranslate>{account.email ?? "—"}</NoTranslate>}
          title={account.email ?? undefined}
          onCopy={
            account.email
              ? () => copyToClipboard(account.email!, t("owner.accountDetail.emailLabel"))
              : undefined
          }
        />
        <InfoRow
          icon="phone"
          label={t("owner.accountDetail.phoneLabel")}
          value={<NoTranslate>{account.phone ?? "—"}</NoTranslate>}
          title={account.phone ?? undefined}
          onCopy={
            account.phone
              ? () => copyToClipboard(account.phone!, t("owner.accountDetail.phoneLabel"))
              : undefined
          }
        />
        <InfoRow
          icon="user"
          label={t("owner.accountDetail.genderLabel")}
          value={
            personalSource.gender === "male"
              ? t("owner.accountDetail.genderMale")
              : personalSource.gender === "female"
              ? t("owner.accountDetail.genderFemale")
              : "—"
          }
        />
        <InfoRow
          icon="calendar"
          label={t("owner.accountDetail.birthDateLabel")}
          value={
            personalSource.birth_date
              ? `${fmtDate(personalSource.birth_date)}${age !== null ? ` (${age} yrs)` : ""}`
              : "—"
          }
        />
        <InfoRow
          icon="pin"
          label={t("owner.accountDetail.branchLabel")}
          value={<NoTranslate>{account.branch?.name ?? "—"}</NoTranslate>}
          title={account.branch?.name ?? undefined}
        />
        <InfoRow
          icon="home"
          label={t("owner.accountDetail.addressLabel")}
          value={<NoTranslate>{personalSource.address ?? "—"}</NoTranslate>}
          title={personalSource.address ?? undefined}
        />
        {account.specialization && (
          <InfoRow
            icon="star"
            label={t("owner.accountDetail.specializationLabel")}
            value={<NoTranslate>{account.specialization}</NoTranslate>}
            title={account.specialization}
          />
        )}
        {account.bio && (
          <InfoRow
            icon="clipboard"
            label={t("owner.accountDetail.bioLabel")}
            value={<NoTranslate>{account.bio}</NoTranslate>}
            title={account.bio}
          />
        )}
      </div>
      </div>

      {account.role === "school" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
          <Icon name="info" className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{t("owner.accountDetail.schoolSettingsHint")}</span>
        </div>
      )}

      <AccountSecuritySection hook={hook} personalSource={personalSource} />
    </div>
  );
}
