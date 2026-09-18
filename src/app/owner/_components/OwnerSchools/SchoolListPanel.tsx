"use client";
import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { NoTranslate } from "@/components/ui/NoTranslate";
import type { useOwnerSchoolsData } from "./useOwnerSchoolsData";

type OwnerSchoolsDataHook = ReturnType<typeof useOwnerSchoolsData>;

export default function SchoolListPanel({ hook }: { hook: OwnerSchoolsDataHook }) {
  const { schools, loading, selectedSchool, setSelectedSchool } = hook;

  return (
    <div className="w-full lg:w-80 shrink-0 bg-paper rounded-2xl border border-line p-5 space-y-4 shadow-xs">
      <div>
        <h3 className="font-display font-bold text-lg text-ink">Partner schools</h3>
        <p className="text-xs text-ink-mute mt-1">Logo and signatures only. Accounts are made elsewhere.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-ink-mute text-sm">{"Saving…"}</div>
      ) : schools.length === 0 ? (
        <div className="text-center py-10 text-ink-mute text-sm">{"No partner schools registered yet."}</div>
      ) : (
        <div className="space-y-1.5">
          {schools.map(school => {
            const isSelected = selectedSchool?.id === school.id;
            return (
              <div
                key={school.id}
                className={`h-14 px-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-ocean-50 text-ocean-700 border border-ocean-200/60 shadow-xs"
                    : "bg-paper hover:bg-paper-tint text-ink border border-transparent hover:border-line"
                }`}
                onClick={() => setSelectedSchool(school)}
              >
                <div className="w-9 h-9 rounded-lg bg-white border border-line flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {school.logo_url ? (
                    <Image src={school.logo_url} alt="Logo" width={36} height={36} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Icon name="book" className="w-4 h-4 text-ink-faint" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm truncate ${isSelected ? "text-ocean-800" : "text-ink"}`}>
                    <NoTranslate>{school.name}</NoTranslate>
                  </div>
                  <div className="text-xs text-ink-mute truncate">
                    <NoTranslate>{school.branch?.name ?? "—"}</NoTranslate>
                  </div>
                </div>
                <Icon
                  name="chevron-right"
                  className={`w-4 h-4 shrink-0 ${isSelected ? "text-ocean-600" : "text-ink-faint"}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
