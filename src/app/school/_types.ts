// Shared types used by multiple School panel components. Types used only by a
// single component are defined in that component's file.
import type { PrintCriterion, PrintBestTime, PrintSignatureItem } from "@/lib/printRapor";

export type Criterion = PrintCriterion;

export interface Student {
  id: string;
  full_name: string;
  member_no: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  school_grade: string | null;
  class_name: string;
  coach_name: string;
  coach_signature_url: string | null;
  period_id: string | null;
  period_label: string | null;
  entry_id: string | null;
  is_filled: boolean;
  scores: Record<string, number | string>;
  notes: string | null;
  personality: string | null;
  motivation: string | null;
  learning_achievements: string | null;
  level: string | null;
  criteria: Criterion[];
  best_times: PrintBestTime[];
  level_strokes: string[];
  level_distances: number[];
  school_logo_url: string | null;
  signatures?: PrintSignatureItem[];
}
