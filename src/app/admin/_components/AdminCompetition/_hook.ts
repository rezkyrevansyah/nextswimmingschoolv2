import type { useCompetitionData } from "./useCompetitionData";
import type { useParticipationData } from "./useParticipationData";

export type AdminCompetitionHook =
  ReturnType<typeof useCompetitionData> &
  ReturnType<typeof useParticipationData>;
