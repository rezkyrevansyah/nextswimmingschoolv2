"use client";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Avatar from "@/components/ui/Avatar";
import { GoogleLanguageSwitcher } from "@/components/GoogleTranslate";
import { Card } from "@/components/ui/Card";
import Bell from "@/components/layout/Bell";
import BetaFeedback, { BETA_FEEDBACK_ENABLED } from "@/components/layout/BetaFeedback";
import { waLink } from "@/lib/utils";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { useSchoolRaporData } from "./_components/useSchoolRaporData";
import { useSchoolRaporExport } from "./_components/useSchoolRaporExport";
import type { SchoolRaporHook } from "./_components/schoolRaporHook";
import SchoolAbsensi from "./_components/SchoolAbsensi";
import SchoolRaporTable from "./_components/SchoolRaporTable";
import SchoolRaporDetailModal from "./_components/SchoolRaporDetailModal";

export default function SchoolPage() {
  const data = useSchoolRaporData();
  const exportHook = useSchoolRaporExport(data);
  const hook: SchoolRaporHook = { ...data, ...exportHook };

  const {
    tab, setTab, schoolName, schoolId, adminWaPhone, activePeriod,
    students, userId, logout, filteredSorted, activeFilterCount, search,
    totalDone, totalPending,
  } = hook;
  const { bulkDownloading, bulkDownloadingLabel, handlePrintAll, handlePrintFiltered } = hook;

  return (
    <div className="min-h-screen bg-paper-tint">
      <header className="bg-white border-b border-line sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 lg:px-7 h-16 flex items-center gap-3">
          <Link href="/"><Logo size={32} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-base text-ink leading-tight truncate">{"School Panel"}</h1>
            <p className="text-xs text-ink-mute truncate"><NoTranslate>{schoolName}</NoTranslate></p>
          </div>
          <GoogleLanguageSwitcher variant="pill" />
          <Bell userId={userId} />
          <Avatar name={schoolName} size={36} />
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mute hover:text-danger-600 px-3 py-2 rounded-lg transition"
            title={"Logout"}
          >
            <Icon name="logout" className="w-4 h-4" />
            <span className="hidden sm:inline">{"Logout"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-7 space-y-5">
        {/* Hero */}
        <div className="bg-ocean-700 text-white rounded-2xl border border-ocean-700 shadow-card p-5 relative overflow-hidden">
          <div className="caustics absolute inset-0 opacity-30" />
          <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-wave-500/30 blur-3xl" />
          <div className="relative grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="text-wave-200 text-[11px] uppercase tracking-widest font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-wave-300 animate-pulse" /> {`Active Period: ${""}`}
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl mt-1.5">
                {activePeriod?.label ? <NoTranslate>{activePeriod.label}</NoTranslate> : "No Active Report Card Period"}
              </h2>
              {activePeriod && (
                <p className="text-white/70 mt-1.5 text-sm max-w-lg">
                  {activePeriod.date_from} – {activePeriod.date_to}
                </p>
              )}
              {totalDone > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handlePrintAll}
                    disabled={bulkDownloading}
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                  >
                    <Icon name="download" className="w-4 h-4" />
                    {bulkDownloading ? bulkDownloadingLabel : `${"Download All (ZIP)"} (${totalDone})`}
                  </button>
                  {(search || activeFilterCount > 0) && filteredSorted.filter(s => s.is_filled).length > 0 && filteredSorted.length < students.length && (
                    <button
                      onClick={handlePrintFiltered}
                      disabled={bulkDownloading}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 text-white/90 text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
                    >
                      <Icon name="download" className="w-4 h-4" />
                      {bulkDownloading ? bulkDownloadingLabel : `${"PDF"} (${filteredSorted.filter(s => s.is_filled).length})`}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Student"}</div>
                <div className="font-display font-bold text-2xl mt-0.5">{students.length}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Complete"}</div>
                <div className="font-display font-bold text-2xl mt-0.5 text-ok-300">{totalDone}</div>
              </div>
              <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-wave-200">{"Incomplete"}</div>
                <div className="font-display font-bold text-2xl mt-0.5 text-warn-300">{totalPending}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-line w-full sm:w-fit shadow-xs sticky top-16 z-20">
          <button
            type="button"
            onClick={() => setTab("rapor")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "rapor" ? "bg-ocean-50 shadow-xs text-ocean-700 font-bold" : "text-ink-mute hover:text-ink"}`}
          >
            {"Student Report Cards"}
          </button>
          <button
            type="button"
            onClick={() => setTab("absensi")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "absensi" ? "bg-ocean-50 shadow-xs text-ocean-700 font-bold" : "text-ink-mute hover:text-ink"}`}
          >
            {"Student Attendance"}
          </button>
        </div>

        {/* Absensi tab */}
        {tab === "absensi" && schoolId && (
          <SchoolAbsensi
            schoolId={schoolId}
            schoolName={schoolName}
            members={students.map(s => ({ id: s.id, name: s.full_name, school_grade: s.school_grade, class_name: s.class_name }))}
          />
        )}

        {/* Rapor tab */}
        {tab === "rapor" && <SchoolRaporTable hook={hook} />}

        {/* Info card */}
        <Card className="bg-wave-50 border-wave-100">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-white text-wave-700 flex items-center justify-center shrink-0">
              <Icon name="info" className="w-5 h-5" />
            </span>
            <div>
              <div className="font-display font-bold text-ink">{"School Panel"}</div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">
                {(<>{"Review official report cards and swimming evaluation results for "}<NoTranslate>{schoolName}</NoTranslate>{"."}</>)}
              </p>
              <a
                href={adminWaPhone
                  ? `https://wa.me/62${adminWaPhone.replace(/^0/, "")}?text=${encodeURIComponent(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}`
                  : waLink(`Halo dari ${schoolName} — ingin konsultasi soal program afiliasi.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex"
              >
                <Btn variant="wa" size="sm" icon="whatsapp">{"Contact Admin WhatsApp"}</Btn>
              </a>
            </div>
          </div>
        </Card>
      </main>

      {/* Rapor detail modal */}
      <SchoolRaporDetailModal hook={hook} />
      {BETA_FEEDBACK_ENABLED && <BetaFeedback role="school" />}
    </div>
  );
}
