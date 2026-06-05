import { describe, it, expect } from "vitest";
import {
  isResponsiveClass,
  hasMobileBase,
  touchTargetSize,
  truncateName,
  modalMaxWidth,
} from "./layout";

// ---------------------------------------------------------------------------
// isResponsiveClass
// ---------------------------------------------------------------------------
describe("isResponsiveClass", () => {
  it("recognises sm: prefix", () => {
    expect(isResponsiveClass("sm:text-lg")).toBe(true);
  });

  it("recognises md: prefix", () => {
    expect(isResponsiveClass("md:grid-cols-2")).toBe(true);
  });

  it("recognises lg: prefix", () => {
    expect(isResponsiveClass("lg:flex")).toBe(true);
  });

  it("recognises xl: prefix", () => {
    expect(isResponsiveClass("xl:px-8")).toBe(true);
  });

  it("recognises 2xl: prefix", () => {
    expect(isResponsiveClass("2xl:container")).toBe(true);
  });

  it("returns false for an unprefixed class", () => {
    expect(isResponsiveClass("text-lg")).toBe(false);
  });

  it("returns false for a padding class without responsive prefix", () => {
    expect(isResponsiveClass("px-4")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isResponsiveClass("")).toBe(false);
  });

  it("returns false for a class that only partially matches (no colon)", () => {
    expect(isResponsiveClass("smtext-lg")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasMobileBase
// ---------------------------------------------------------------------------
describe("hasMobileBase", () => {
  it("returns true when a non-prefixed class contains the property", () => {
    expect(hasMobileBase(["px-4", "sm:px-8"], "px")).toBe(true);
  });

  it("returns false when only prefixed classes contain the property", () => {
    expect(hasMobileBase(["sm:px-8"], "px")).toBe(false);
  });

  it("returns true for grid-cols base class alongside responsive override", () => {
    expect(hasMobileBase(["grid-cols-1", "sm:grid-cols-2"], "grid-cols")).toBe(true);
  });

  it("returns false when the class list is empty", () => {
    expect(hasMobileBase([], "px")).toBe(false);
  });

  it("returns false when property is not present at all", () => {
    expect(hasMobileBase(["flex", "items-center"], "px")).toBe(false);
  });

  it("returns true when mobile base exists even with multiple responsive variants", () => {
    expect(hasMobileBase(["text-sm", "md:text-base", "lg:text-lg"], "text")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// touchTargetSize
// ---------------------------------------------------------------------------
describe("touchTargetSize", () => {
  it("returns ok for exactly 44px (minimum recommended size)", () => {
    expect(touchTargetSize(44)).toBe("ok");
  });

  it("returns ok for 48px (comfortably above threshold)", () => {
    expect(touchTargetSize(48)).toBe("ok");
  });

  it("returns too-small for 43px (just below threshold)", () => {
    expect(touchTargetSize(43)).toBe("too-small");
  });

  it("returns too-small for 32px", () => {
    expect(touchTargetSize(32)).toBe("too-small");
  });

  it("returns too-small for 0", () => {
    expect(touchTargetSize(0)).toBe("too-small");
  });

  it("returns ok for large values like 100px", () => {
    expect(touchTargetSize(100)).toBe("ok");
  });

  it("returns too-small for negative values", () => {
    expect(touchTargetSize(-1)).toBe("too-small");
  });
});

// ---------------------------------------------------------------------------
// truncateName
// ---------------------------------------------------------------------------
describe("truncateName", () => {
  it("returns name unchanged when shorter than maxLen", () => {
    // "Rezky Revansyah" = 15 chars, maxLen = 20
    expect(truncateName("Rezky Revansyah", 20)).toBe("Rezky Revansyah");
  });

  it("truncates and appends ellipsis when name exceeds maxLen", () => {
    // "Muhammad Abdul Aziz Ramadhan" = 28 chars, maxLen = 20
    // slice(0, 19) = "Muhammad Abdul Aziz" + "…"
    expect(truncateName("Muhammad Abdul Aziz Ramadhan", 20)).toBe(
      "Muhammad Abdul Aziz…"
    );
  });

  it("returns name unchanged when length equals maxLen exactly", () => {
    // exactly 20 chars
    const name = "A".repeat(20);
    expect(truncateName(name, 20)).toBe(name);
  });

  it("returns empty string for an empty input", () => {
    expect(truncateName("", 20)).toBe("");
  });

  it("returns name unchanged when length equals maxLen of 5", () => {
    expect(truncateName("Hello", 5)).toBe("Hello");
  });

  it("truncates a 11-char name to maxLen 5", () => {
    // slice(0, 4) = "Hell" + "…"
    expect(truncateName("Hello World", 5)).toBe("Hell…");
  });

  it("uses default maxLen of 20 when not provided", () => {
    const name = "A".repeat(25);
    const result = truncateName(name);
    expect(result.length).toBe(20); // 19 chars + ellipsis (1 char = "…")
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not truncate a name of exactly 1 char with default maxLen", () => {
    expect(truncateName("A")).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// modalMaxWidth
// ---------------------------------------------------------------------------
describe("modalMaxWidth", () => {
  it('maps "sm" to "max-w-sm"', () => {
    expect(modalMaxWidth("sm")).toBe("max-w-sm");
  });

  it('maps "md" to "max-w-md"', () => {
    expect(modalMaxWidth("md")).toBe("max-w-md");
  });

  it('maps "lg" to "max-w-lg"', () => {
    expect(modalMaxWidth("lg")).toBe("max-w-lg");
  });

  it('maps "xl" to "max-w-xl"', () => {
    expect(modalMaxWidth("xl")).toBe("max-w-xl");
  });

  it("returns a string that starts with max-w-", () => {
    expect(modalMaxWidth("md")).toMatch(/^max-w-/);
  });
});
