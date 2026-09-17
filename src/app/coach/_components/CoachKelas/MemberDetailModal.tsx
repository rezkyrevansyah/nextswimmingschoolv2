"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { useLocale } from "@/components/providers/LocaleProvider";
import { waLink } from "@/lib/utils";
import { calcAgeFromBirthDate, type MemberDetail } from "./_shared";

export default function MemberDetailModal({ member, onClose }: { member: MemberDetail; onClose: () => void }) {
  const { t } = useLocale();
  const name = member.profile?.full_name ?? "—";
  const age = member.profile?.birth_date ? calcAgeFromBirthDate(member.profile.birth_date) : null;

  const rows: [string, string | null | undefined][] = [
    [t("coach.kelas.memberAgeLabel"), age != null ? t("coach.kelas.ageYears", { age }) : null],
    [t("coach.kelas.memberGenderLabel"), member.profile?.gender === "male" ? t("coach.kelas.memberGenderMale") : member.profile?.gender === "female" ? t("coach.kelas.memberGenderFemale") : null],
    [t("coach.kelas.memberPhoneLabel"), member.profile?.phone],
    [t("coach.kelas.memberAddressLabel"), member.profile?.address],
    [t("coach.kelas.memberHealthNotesLabel"), member.profile?.health_notes],
  ];

  return (
    <Modal open onClose={onClose} title={name} size="sm"
      footer={
        <div className="flex items-center gap-2 w-full">
          {member.profile?.phone && (
            <a href={waLink(t("coach.kelas.waGreeting", { name }))} target="_blank" rel="noreferrer" className="flex-1">
              <Btn variant="wa" className="w-full" icon="whatsapp">{t("coach.kelas.chatMemberBtn")}</Btn>
            </a>
          )}
          <Btn variant="ghost" onClick={onClose}>{t("common.actions.close")}</Btn>
        </div>
      }>
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={name} src={member.profile?.avatar_url ?? undefined} size={48} />
          <div>
            <div className="font-display font-bold text-ink text-base">{name}</div>
            {age != null && <div className="text-xs text-ink-mute">{t("coach.kelas.ageYears", { age })}</div>}
          </div>
        </div>
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex gap-2 py-2 border-b border-line last:border-0">
            <div className="text-xs text-ink-mute w-36 shrink-0 pt-0.5">{label}</div>
            <div className="text-sm text-ink font-medium flex-1">{value}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
