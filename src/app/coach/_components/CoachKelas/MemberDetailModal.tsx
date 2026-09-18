"use client";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { waLink } from "@/lib/utils";
import { calcAgeFromBirthDate, type MemberDetail } from "./_shared";

export default function MemberDetailModal({ member, onClose }: { member: MemberDetail; onClose: () => void }) {
  const name = member.profile?.full_name ?? "—";
  const age = member.profile?.birth_date ? calcAgeFromBirthDate(member.profile.birth_date) : null;

  const rows: [string, React.ReactNode][] = [
    ["Age", age != null ? `${age} years old` : null],
    ["Gender", member.profile?.gender === "male" ? "Male" : member.profile?.gender === "female" ? "Female" : null],
    ["Phone No.", member.profile?.phone ? <NoTranslate>{member.profile.phone}</NoTranslate> : null],
    ["Address", member.profile?.address ? <NoTranslate>{member.profile.address}</NoTranslate> : null],
    ["Health history / allergies", member.profile?.health_notes ? <NoTranslate>{member.profile.health_notes}</NoTranslate> : null],
  ];

  return (
    <Modal open onClose={onClose} title={<NoTranslate>{name}</NoTranslate>} size="sm"
      footer={
        <div className="flex items-center gap-2 w-full">
          {member.profile?.phone && (
            <a href={waLink(`Hello ${name}, I'm a Coach from Next Swimming School.`)} target="_blank" rel="noreferrer" className="flex-1">
              <Btn variant="wa" className="w-full" icon="whatsapp">{"Chat Student"}</Btn>
            </a>
          )}
          <Btn variant="ghost" onClick={onClose}>{"Close"}</Btn>
        </div>
      }>
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={name} src={member.profile?.avatar_url ?? undefined} size={48} />
          <div>
            <div className="font-display font-bold text-ink text-base"><NoTranslate>{name}</NoTranslate></div>
            {age != null && <div className="text-xs text-ink-mute">{`${age} years old`}</div>}
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
