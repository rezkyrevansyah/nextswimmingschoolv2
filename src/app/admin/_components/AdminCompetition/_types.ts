export interface CompetitionRow {
  id: string;
  name: string;
  organizer: string | null;
  location: string | null;
  city: string | null;
  start_date: string;
  end_date: string | null;
  level: string;
  description: string | null;
  created_by_id: string | null;
  created_at: string;
  participations_count?: number;
  medals_count?: number;
}

export interface ParticipationRow {
  id: string;
  competition_id: string;
  member_id: string;
  branch_id: string;
  coach_id: string | null;
  category: string;
  stroke: string | null;
  distance_meters: number | null;
  age_group: string | null;
  time_seconds: number | null;
  time_formatted: string | null;
  rank: number | null;
  result_status: string;
  award: string;
  custom_award_label: string | null;
  notes: string | null;
  created_at: string;
  member?: {
    id: string;
    profile?: { full_name: string; avatar_url: string | null } | null;
  } | null;
  branch?: { name: string } | null;
  coach?: { full_name: string } | null;
}

export interface CompetitionDocumentRow {
  id: string;
  competition_id: string;
  member_id: string;
  document_url: string;
  content_type: string | null;
}

export interface MemberOption {
  id: string;
  full_name: string;
  branch_name?: string;
  branch_id: string;
  type: string;
  member_no: string | null;
}

// Computed inside the component (needs t()) — see getMemberTypeLabels/getAwardLabels below.
export interface CoachOption {
  id: string;
  full_name: string;
}

export const getMemberTypeLabels = (t: (key: string) => string): Record<string, string> => ({
  reguler: t("admin.competition.memberTypeReguler"),
  private: t("admin.competition.memberTypePrivate"),
  school_affiliate: t("admin.competition.memberTypeSchoolAffiliate"),
});

export const getAwardLabels = (t: (key: string) => string): Record<string, { label: string; icon: string; style: string }> => ({
  gold: { label: t("admin.competition.awardGold"), icon: "🥇", style: "bg-amber-100 text-amber-900 border-amber-300 font-bold" },
  silver: { label: t("admin.competition.awardSilver"), icon: "🥈", style: "bg-slate-100 text-slate-800 border-slate-300 font-bold" },
  bronze: { label: t("admin.competition.awardBronze"), icon: "🥉", style: "bg-amber-900/10 text-amber-800 border-amber-800/30 font-bold" },
  fourth_place: { label: t("admin.competition.awardFourthPlace"), icon: "🏅", style: "bg-blue-50 text-blue-800 border-blue-200" },
  finalist: { label: t("admin.competition.awardFinalist"), icon: "⭐", style: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  participant: { label: t("admin.competition.awardParticipant"), icon: "🏊", style: "bg-gray-100 text-gray-700 border-gray-200" },
  custom: { label: t("admin.competition.awardCustom"), icon: "🏆", style: "bg-purple-50 text-purple-800 border-purple-200 font-bold" },
});
