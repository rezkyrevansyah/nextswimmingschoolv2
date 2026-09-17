// Private types for the Owner "Rapor Levels" screen (levels, criteria, best-time matrix, class scope).

export interface RaporLevel {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  all_classes: boolean;
}

export interface ClassOption { id: string; name: string; branch_id: string | null; branch_name: string | null; }

export interface LevelCriterion {
  id: string; label: string; kind: string; options: string[] | null; sort_order: number;
}

export interface LevelDistanceRow { id: string; distance: number; sort_order: number }
export interface LevelStrokeRow { id: string; name: string; sort_order: number }
export interface BestTimeTargetRow { id: string; stroke_id: string; distance_id: string; target_time_seconds: number | null }
