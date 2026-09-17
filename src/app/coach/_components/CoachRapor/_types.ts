export interface Criterion {
  id: string; label: string;
  kind: "score_10" | "score_100" | "choice" | "text";
  options: string[] | null;
  sort_order?: number;
}
