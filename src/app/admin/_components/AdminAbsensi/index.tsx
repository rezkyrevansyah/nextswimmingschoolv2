"use client";
import { useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import AdminAbsensiCoach from "./AdminAbsensiCoach";
import AdminAbsensiMember from "./AdminAbsensiMember";

export default function AdminAbsensi({ branchId }: { branchId: string }) {
  const { t } = useLocale();
  const [sub, setSub] = useState<"coach" | "member">("coach");
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-bold text-2xl">{t("admin.absensi.pageTitle")}</h2>
        <p className="text-ink-mute text-sm mt-0.5">{t("admin.absensi.pageSub")}</p>
      </div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-paper-tint rounded-xl p-1 w-fit">
        {([["coach", t("admin.absensi.subTabCoach")], ["member", t("admin.absensi.subTabMember")]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSub(id)}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors ${sub === id ? "bg-white text-ocean-700 shadow-sm" : "text-ink-mute hover:text-ink-soft"}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === "coach" && <AdminAbsensiCoach branchId={branchId} />}
      {sub === "member" && <AdminAbsensiMember branchId={branchId} />}
    </div>
  );
}
