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
 * Formats seconds (e.g. 75.5 or 100) into string "1:15.50" or "1:40.00" for display/editing.
 * If less than 60 seconds (e.g. 42.31), displays "42.31".
 */
export function fmtSwimTimeInput(secs: number): string {
  if (!secs || isNaN(secs) || secs <= 0) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const sPad = s < 10 ? `0${s.toFixed(2)}` : s.toFixed(2);
  return m > 0 ? `${m}:${sPad}` : `${sPad}`;
}

/**
 * Parses user input string into total seconds.
 * Supports:
 * - "1:40" or "1:40.00" -> 1*60 + 40 = 100 seconds
 * - "100" -> 100 seconds
 */
export function parseSwimTimeInput(input: string): number {
  if (!input) return 0;
  const str = input.trim();
  if (str.includes(":")) {
    const parts = str.split(":");
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(str) || 0;
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
        time: hit ? fmtSwimTimeInput(hit.time_seconds) : "",
      });
    }
  }
  return cells;
}

/**
 * Recorded best times that don't match any current (stroke, distance) pair
 * in the level's live template — e.g. the level's strokes/distances were
 * edited after this student's time was recorded. Surfaced separately so
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
