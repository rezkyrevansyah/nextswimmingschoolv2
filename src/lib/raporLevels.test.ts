import { describe, it, expect } from "vitest";
import { mergeBestTimeTemplate } from "./raporLevels";

describe("mergeBestTimeTemplate", () => {
  it("returns an empty list when there is no template and no recorded times", () => {
    const result = mergeBestTimeTemplate([], []);
    expect(result).toEqual([]);
  });

  it("produces one empty-time row per template row when nothing is recorded yet", () => {
    const template = [
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: 45, sort_order: 0 },
      { id: "t2", stroke: "Backstroke", distance: 50, target_time_seconds: 50, sort_order: 1 },
    ];
    const result = mergeBestTimeTemplate(template, []);
    expect(result).toEqual([
      { id: undefined, stroke: "Freestyle", distance: "50", time: "" },
      { id: undefined, stroke: "Backstroke", distance: "50", time: "" },
    ]);
  });

  it("pre-fills a template row's time from a matching recorded best time (case-insensitive stroke match)", () => {
    const template = [
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: 45, sort_order: 0 },
    ];
    const recorded = [
      { id: "r1", stroke: "freestyle", distance: 50, time_seconds: 42.31 },
    ];
    const result = mergeBestTimeTemplate(template, recorded);
    expect(result).toEqual([
      { id: "r1", stroke: "Freestyle", distance: "50", time: "42.31" },
    ]);
  });

  it("appends a recorded row that has no matching template row instead of dropping it", () => {
    const template = [
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: 45, sort_order: 0 },
    ];
    const recorded = [
      { id: "r1", stroke: "Freestyle", distance: 50, time_seconds: 42.31 },
      { id: "r2", stroke: "Butterfly", distance: 100, time_seconds: 90 },
    ];
    const result = mergeBestTimeTemplate(template, recorded);
    expect(result).toEqual([
      { id: "r1", stroke: "Freestyle", distance: "50", time: "42.31" },
      { id: "r2", stroke: "Butterfly", distance: "100", time: "90" },
    ]);
  });

  it("orders template rows by sort_order regardless of input array order", () => {
    const template = [
      { id: "t2", stroke: "Backstroke", distance: 50, target_time_seconds: null, sort_order: 1 },
      { id: "t1", stroke: "Freestyle", distance: 50, target_time_seconds: null, sort_order: 0 },
    ];
    const result = mergeBestTimeTemplate(template, []);
    expect(result.map(r => r.stroke)).toEqual(["Freestyle", "Backstroke"]);
  });
});
