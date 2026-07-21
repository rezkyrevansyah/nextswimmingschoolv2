export interface LevelDistance {
  id: string;
  distance: number;
  sort_order: number;
}

export interface LevelStroke {
  id: string;
  name: string;
  sort_order: number;
}

export interface RecordedBestTime {
  id: string;
  stroke: string;
  distance: number;
  time_seconds: number;
}

export interface MatrixCell {
  strokeId: string;
  distanceId: string;
  stroke: string;
  distance: number;
  recordedId?: string;
  time: string;
}

/**
 * Builds the stroke x distance matrix a coach fills in: one cell per
 * (stroke, distance) pair defined by the level, ordered by each list's
 * sort_order, pre-filled from a matching recorded best time when one exists
 * (case-insensitive stroke match, exact distance match).
 */
export function buildBestTimeMatrix(
  distances: LevelDistance[],
  strokes: LevelStroke[],
  recorded: RecordedBestTime[]
): MatrixCell[] {
  const sortedDistances = [...distances].sort((a, b) => a.sort_order - b.sort_order);
  const sortedStrokes = [...strokes].sort((a, b) => a.sort_order - b.sort_order);

  const cells: MatrixCell[] = [];
  for (const stroke of sortedStrokes) {
    for (const distance of sortedDistances) {
      const hit = recorded.find(
        r => r.stroke.toLowerCase() === stroke.name.toLowerCase() && r.distance === distance.distance
      );
      cells.push({
        strokeId: stroke.id,
        distanceId: distance.id,
        stroke: stroke.name,
        distance: distance.distance,
        recordedId: hit?.id,
        time: hit ? String(hit.time_seconds) : "",
      });
    }
  }
  return cells;
}

/**
 * Recorded best times that don't match any current (stroke, distance) pair
 * in the level's live template — e.g. the level's strokes/distances were
 * edited after this member's time was recorded. Surfaced separately so
 * historical data is never silently dropped from view.
 */
export function findUnmatchedRecordedTimes(
  distances: LevelDistance[],
  strokes: LevelStroke[],
  recorded: RecordedBestTime[]
): RecordedBestTime[] {
  const strokeNames = new Set(strokes.map(s => s.name.toLowerCase()));
  const distanceValues = new Set(distances.map(d => d.distance));
  return recorded.filter(
    r => !strokeNames.has(r.stroke.toLowerCase()) || !distanceValues.has(r.distance)
  );
}
