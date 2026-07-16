export interface LevelBestTimeTemplateRow {
  id: string;
  stroke: string;
  distance: number;
  target_time_seconds: number | null;
  sort_order: number;
}

export interface RecordedBestTime {
  id: string;
  stroke: string;
  distance: number;
  time_seconds: number;
}

export interface BestTimeFormRow {
  id?: string;
  stroke: string;
  distance: string;
  time: string;
}

/**
 * Builds the initial Personal Best Time form rows for a rapor entry: one row
 * per level template entry (pre-filled with the member's recorded time when
 * one exists), followed by any recorded times that don't match a template
 * row (e.g. leftover data from before a level had a template, or an extra
 * stroke a coach added manually) so no existing data is silently dropped.
 */
export function mergeBestTimeTemplate(
  template: LevelBestTimeTemplateRow[],
  recorded: RecordedBestTime[]
): BestTimeFormRow[] {
  const sortedTemplate = [...template].sort((a, b) => a.sort_order - b.sort_order);
  const matchedRecordedIds = new Set<string>();

  const templateRows: BestTimeFormRow[] = sortedTemplate.map(t => {
    const hit = recorded.find(
      r => r.stroke.toLowerCase() === t.stroke.toLowerCase() && r.distance === t.distance
    );
    if (hit) matchedRecordedIds.add(hit.id);
    return {
      id: hit?.id,
      stroke: t.stroke,
      distance: String(t.distance),
      time: hit ? String(hit.time_seconds) : "",
    };
  });

  const extraRows: BestTimeFormRow[] = recorded
    .filter(r => !matchedRecordedIds.has(r.id))
    .map(r => ({ id: r.id, stroke: r.stroke, distance: String(r.distance), time: String(r.time_seconds) }));

  return [...templateRows, ...extraRows];
}
