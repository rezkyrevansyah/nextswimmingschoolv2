import type { PrintCriterion, PrintBestTime } from "@/lib/printRapor";

export interface CoachReviewSlot {
  coach_id: string; coach_name: string; role: string;
  review_id: string | null; review_stars: number | null; review_message: string | null;
}

export interface RaporEntryFull {
  id: string; period: string; period_id: string; period_is_open: boolean; class_name: string; coach_name: string;
  class_id: string;
  scores: Record<string, number | string>; notes: string | null;
  personality: string | null; motivation: string | null; learning_achievements: string | null;
  level: string | null;
  coachReviews: CoachReviewSlot[];
  criteria: PrintCriterion[];
  best_times: PrintBestTime[];
  level_strokes: string[];
  level_distances: number[];
  coach_signature_url: string | null;
}
