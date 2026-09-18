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
    ROLE_LABELS, account,
    coachClasses, certifications, studentData, downloadingQr, linkedStaff,
    copyToClipboard, handleDownloadSingleQR, calcAge,
  } = hook;
  if (!account) return null;

  const roleLabel = ROLE_LABELS[account.role] ?? account.role;
  const isKnownRole = account.role in ROLE_LABELS;
  const roleColor = ROLE_COLORS[account.role] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const displayName = account.full_name?.trim() || account.email?.split("@")[0] || roleLabel || "—";
  const activeQR = studentData?.qr_code || studentData?.student_no || account.qr_code || account.user_no || account.id;

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
              title={"Inactive Account"}
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
              <Status kind="archived">{"Inactive"}</Status>
            ) : (
              <Status kind="active">{"Active"}</Status>
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
            {(studentData?.student_no || account.user_no) && (
              <span className="font-mono text-xs font-bold text-ocean-700 bg-ocean-50 px-2.5 py-0.5 rounded-lg border border-ocean-200">
                <NoTranslate>{studentData?.student_no || account.user_no}</NoTranslate>
              </span>
            )}
          </div>
          <div className="text-xs text-ink-mute mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span>{`Registered ${fmtDate(account.created_at)}`}</span>
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
          title={"Use this code to scan attendance, class check-in, and official profile verification."}
        >
          <QRBox value={activeQR} size={56} hideCaption />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            {"ID"}
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
            onClick={() => copyToClipboard(activeQR, "QR Code")}
            title={"Copy Code"}
          />
          <Btn
            variant="ghost"
            size="sm"
            icon="download"
            onClick={handleDownloadSingleQR}
            disabled={downloadingQr}
            title={"Download ID card (PNG)"}
          />
        </div>
      </div>

      {/* Student Specific Stats & Classes */}
      {account.role === "student" && studentData && (
        <div>
          <SectionLabel sub={`Type: ${studentData.type}`}>
            {"Student Studentship Details"}
          </SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center">
              <div className="text-[10px] text-ink-faint uppercase font-bold">{"Remaining Sessions"}</div>
              <div className="text-xl font-bold font-mono text-ocean-700">
                {studentData.remaining_sessions ?? "—"}
              </div>
            </div>
            <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center">
              <div className="text-[10px] text-ink-faint uppercase font-bold">{"Total Sessions"}</div>
              <div className="text-xl font-bold font-mono text-ink">
                {studentData.total_sessions ?? "—"}
              </div>
            </div>
            <div className="bg-paper-tint rounded-xl p-2.5 border border-line/60 text-center col-span-2 sm:col-span-2">
              <div className="text-[10px] text-ink-faint uppercase font-bold">{"School Affiliate"}</div>
              <div className="text-sm font-semibold text-ink truncate mt-0.5">
                {studentData.school?.name ? (
                  <NoTranslate>{studentData.school.name}</NoTranslate>
                ) : (
                  "Non-Affiliated"
                )}
              </div>
              {studentData.school_grade && (
                <div className="text-xs text-ink-mute mt-0.5">
                  {"School Grade"}: <NoTranslate>{studentData.school_grade}</NoTranslate>
                </div>
              )}
            </div>
          </div>

          {/* Enrolled classes */}
          {studentData.student_classes && studentData.student_classes.length > 0 && (
            <div className="pt-2 mt-2.5 border-t border-line/60">
              <div className="text-[11px] font-bold text-ink-mute mb-1.5">{"Enrolled Classes:"}</div>
              <div className="flex flex-wrap gap-1.5">
                {studentData.student_classes.map((mc, idx) => (
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
          <SectionLabel>{"Coach Classes & Certifications"}</SectionLabel>
          {coachClasses.length > 0 ? (
            <div>
              <div className="text-[11px] font-bold text-ink-mute mb-1.5">{"Classes Taught:"}</div>
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
      <SectionLabel>{"Contact & Personal Info"}</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-3">
        <InfoRow
          icon="mail"
          label={"Email"}
          value={<NoTranslate>{account.email ?? "—"}</NoTranslate>}
          title={account.email ?? undefined}
          onCopy={
            account.email
              ? () => copyToClipboard(account.email!, "Email")
              : undefined
          }
        />
        <InfoRow
          icon="phone"
          label={"Phone / WhatsApp"}
          value={<NoTranslate>{account.phone ?? "—"}</NoTranslate>}
          title={account.phone ?? undefined}
          onCopy={
            account.phone
              ? () => copyToClipboard(account.phone!, "Phone / WhatsApp")
              : undefined
          }
        />
        <InfoRow
          icon="user"
          label={"Gender"}
          value={
            personalSource.gender === "male"
              ? "Male"
              : personalSource.gender === "female"
              ? "Female"
              : "—"
          }
        />
        <InfoRow
          icon="calendar"
          label={"Date of Birth"}
          value={
            personalSource.birth_date
              ? `${fmtDate(personalSource.birth_date)}${age !== null ? ` (${age} yrs)` : ""}`
              : "—"
          }
        />
        <InfoRow
          icon="pin"
          label={"Center"}
          value={<NoTranslate>{account.branch?.name ?? "—"}</NoTranslate>}
          title={account.branch?.name ?? undefined}
        />
        <InfoRow
          icon="home"
          label={"Address"}
          value={<NoTranslate>{personalSource.address ?? "—"}</NoTranslate>}
          title={personalSource.address ?? undefined}
        />
        {account.specialization && (
          <InfoRow
            icon="star"
            label={"Specialization"}
            value={<NoTranslate>{account.specialization}</NoTranslate>}
            title={account.specialization}
          />
        )}
        {account.bio && (
          <InfoRow
            icon="clipboard"
            label={"Bio"}
            value={<NoTranslate>{account.bio}</NoTranslate>}
            title={account.bio}
          />
        )}
      </div>
      </div>

      {account.role === "school" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
          <Icon name="info" className="w-4 h-4 shrink-0 text-amber-500" />
          <span>{"This is a school partner account. Logo, signature configuration, and other school-specific settings are managed from the Schools menu."}</span>
        </div>
      )}

      <AccountSecuritySection hook={hook} personalSource={personalSource} />
    </div>
  );
}
