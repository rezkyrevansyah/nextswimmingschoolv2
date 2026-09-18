import type { PrintCriterion, PrintBestTime, PrintSignatureItem } from "@/lib/printRapor";

export interface RaporPeriod {
  id: string; label: string; date_from: string; date_to: string;
  is_open: boolean; branch_id: string;
}

export interface Student {
  id: string;
  full_name: string;
  student_no: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  class_name: string;
  coach_name: string;
  coach_signature_url: string | null;
  is_filled: boolean;
  scores: Record<string, number | string>;
  notes: string | null;
  personality: string | null;
  motivation: string | null;
  learning_achievements: string | null;
  level: string | null;
  criteria: PrintCriterion[];
  best_times: PrintBestTime[];
  level_strokes: string[];
  level_distances: number[];
  school_logo_url?: string | null;
  signatures?: PrintSignatureItem[];
}
