"use client";
import PhotoLightbox from "@/components/ui/PhotoLightbox";
import { useCompetitionData } from "./useCompetitionData";
import { useParticipationData } from "./useParticipationData";
import type { AdminCompetitionHook } from "./_hook";
import AwardsTab from "./AwardsTab";
import StudentAchievementModal from "./StudentAchievementModal";
import CompetitionsTab from "./CompetitionsTab";
import CompetitionFormModal from "./CompetitionFormModal";
import CompetitionDetailModal from "./CompetitionDetailModal";
import ParticipantFormModal from "./ParticipantFormModal";

export default function AdminCompetition({ branchId }: { branchId: string }) {
  const comp = useCompetitionData(branchId);
  const part = useParticipationData({
    branchId,
    studentsList: comp.studentsList,
    selectedComp: comp.selectedComp,
    loadCompetitions: comp.loadCompetitions,
  });

  const hook: AdminCompetitionHook = { ...comp, ...part };
  const { activeTab, setActiveTab, totalComps, totalParticipations, totalMedals, setCompFormReturnToPart, openCreateComp, openEditComp, competitions } = hook;
  const { setPartForm, lightboxUrl, setLightboxUrl } = hook;

  return (
    <div className="space-y-4">
      {/* ── Summary Stats matching pen.dev qgz4S ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-paper border border-line rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">{"Total Competitions"}</div>
          <div className="text-2xl font-extrabold font-display text-ocean-600">{totalComps}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">{"Total Participations"}</div>
          <div className="text-2xl font-extrabold font-display text-wave-600">{totalParticipations}</div>
        </div>
        <div className="bg-paper border border-line rounded-2xl p-5 space-y-1.5 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-ink-faint tracking-wider">{"Total Medals / Achievements"}</div>
          <div className="text-2xl font-extrabold font-display text-ok-600">{totalMedals}</div>
        </div>
      </div>

      {/* ── Tab Switcher matching pen.dev fxNZQ ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("awards")}
          className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "awards"
              ? "bg-ocean-600 text-white shadow-xs"
              : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
          }`}
        >
          {"Participant Awards"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("competitions")}
          className={`h-10 px-5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "competitions"
              ? "bg-ocean-600 text-white shadow-xs"
              : "bg-paper border border-line text-ink-soft hover:bg-paper-tint hover:text-ink"
          }`}
        >
          {"Competitions"}
        </button>
      </div>

      {/* ── AWARDS TAB: Student-first landing view matching pen.dev CeNt0 & NmdyX ── */}
      {activeTab === "awards" && <AwardsTab hook={hook} />}

      {/* ── Modal: Student Achievement Detail (popup opened by clicking a student above) ── */}
      <StudentAchievementModal hook={hook} />

      {/* ── COMPETITIONS TAB ── */}
      {activeTab === "competitions" && <CompetitionsTab hook={hook} />}

      {/* ── Modal: Create / Edit Competition ── */}
      <CompetitionFormModal
        hook={hook}
        onSaved={newCompId => setPartForm(prev => ({ ...prev, competition_id: newCompId }))}
      />

      {/* ── Modal: Competition Detail & Participant Management ── */}
      <CompetitionDetailModal hook={hook} />

      {/* ── Modal: Add / Edit Participant Result ── */}
      <ParticipantFormModal
        hook={hook}
        onNewCompRequested={() => { setCompFormReturnToPart(true); openCreateComp(); }}
        onEditCompRequested={compId => {
          const comp2 = competitions.find(c => c.id === compId);
          if (comp2) { setCompFormReturnToPart(true); openEditComp(comp2); }
        }}
      />

      {/* Lightbox Preview */}
      {lightboxUrl && (
        <PhotoLightbox
          src={lightboxUrl}
          name={"Certificate / Competition Proof"}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}
