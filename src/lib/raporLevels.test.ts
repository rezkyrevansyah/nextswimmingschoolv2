import { describe, it, expect } from "vitest";
import { buildBestTimeMatrix, findUnmatchedRecordedTimes } from "./raporLevels";

describe("buildBestTimeMatrix", () => {
  it("returns an empty grid when there are no distances and no strokes", () => {
    const result = buildBestTimeMatrix([], [], []);
    expect(result).toEqual([]);
  });

  it("produces one empty-time cell per (stroke, distance) pair when nothing is recorded yet", () => {
    const distances = [{ id: "d1", distance: 25, sort_order: 0 }, { id: "d2", distance: 50, sort_order: 1 }];
    const strokes = [{ id: "s1", name: "Freestyle", sort_order: 0 }];
    const result = buildBestTimeMatrix(distances, strokes, []);
    expect(result).toEqual([
      { strokeId: "s1", distanceId: "d1", stroke: "Freestyle", distance: 25, recordedId: undefined, time: "" },
      { strokeId: "s1", distanceId: "d2", stroke: "Freestyle", distance: 50, recordedId: undefined, time: "" },
    ]);
  });

  it("pre-fills a cell's time from a matching recorded best time (case-insensitive stroke match)", () => {
    const distances = [{ id: "d1", distance: 50, sort_order: 0 }];
    const strokes = [{ id: "s1", name: "Freestyle", sort_order: 0 }];
    const recorded = [{ id: "r1", stroke: "freestyle", distance: 50, time_seconds: 42.31 }];
    const result = buildBestTimeMatrix(distances, strokes, recorded);
    expect(result).toEqual([
      { strokeId: "s1", distanceId: "d1", stroke: "Freestyle", distance: 50, recordedId: "r1", time: "42.31" },
    ]);
  });

  it("orders cells by stroke sort_order then distance sort_order, regardless of input array order", () => {
    const distances = [{ id: "d2", distance: 50, sort_order: 1 }, { id: "d1", distance: 25, sort_order: 0 }];
    const strokes = [{ id: "s2", name: "Backstroke", sort_order: 1 }, { id: "s1", name: "Freestyle", sort_order: 0 }];
    const result = buildBestTimeMatrix(distances, strokes, []);
    expect(result.map(c => `${c.stroke}-${c.distance}`)).toEqual([
      "Freestyle-25", "Freestyle-50", "Backstroke-25", "Backstroke-50",
    ]);
  });
});

describe("findUnmatchedRecordedTimes", () => {
  it("returns an empty list when every recorded time matches a current (stroke, distance) pair", () => {
    const distances = [{ id: "d1", distance: 50, sort_order: 0 }];
    const strokes = [{ id: "s1", name: "Freestyle", sort_order: 0 }];
    const recorded = [{ id: "r1", stroke: "Freestyle", distance: 50, time_seconds: 42.31 }];
    expect(findUnmatchedRecordedTimes(distances, strokes, recorded)).toEqual([]);
  });

  it("keeps a recorded row whose stroke is no longer part of the level's template", () => {
    const distances = [{ id: "d1", distance: 50, sort_order: 0 }];
    const strokes = [{ id: "s1", name: "Freestyle", sort_order: 0 }];
    const recorded = [
      { id: "r1", stroke: "Freestyle", distance: 50, time_seconds: 42.31 },
      { id: "r2", stroke: "Butterfly", distance: 100, time_seconds: 90 },
    ];
    expect(findUnmatchedRecordedTimes(distances, strokes, recorded)).toEqual([
      { id: "r2", stroke: "Butterfly", distance: 100, time_seconds: 90 },
    ]);
  });

  it("keeps a recorded row whose distance is no longer part of the level's template", () => {
    const distances = [{ id: "d1", distance: 50, sort_order: 0 }];
    const strokes = [{ id: "s1", name: "Freestyle", sort_order: 0 }];
    const recorded = [{ id: "r1", stroke: "Freestyle", distance: 100, time_seconds: 90 }];
    expect(findUnmatchedRecordedTimes(distances, strokes, recorded)).toEqual([
      { id: "r1", stroke: "Freestyle", distance: 100, time_seconds: 90 },
    ]);
  });
});
