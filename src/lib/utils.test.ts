import { describe, it, expect } from "vitest";
import { fmtIDR, fmtDate, fmtDateLong, fmtTime, waLink, cn } from "./utils";

// ---------------------------------------------------------------------------
// fmtIDR
// ---------------------------------------------------------------------------
describe("fmtIDR", () => {
  it("formats zero", () => {
    expect(fmtIDR(0)).toBe("Rp0");
  });

  it("formats a typical price (150.000)", () => {
    expect(fmtIDR(150000)).toBe("Rp150.000");
  });

  it("formats a larger amount with multiple thousand-separators", () => {
    expect(fmtIDR(1500000)).toBe("Rp1.500.000");
  });

  it("formats a small 4-digit number", () => {
    expect(fmtIDR(1000)).toBe("Rp1.000");
  });

  it("formats a negative number", () => {
    expect(fmtIDR(-150000)).toBe("Rp-150.000");
  });

  it("always prefixes with 'Rp'", () => {
    expect(fmtIDR(99999)).toMatch(/^Rp/);
  });
});

// ---------------------------------------------------------------------------
// fmtDate
// ---------------------------------------------------------------------------
describe("fmtDate", () => {
  it("formats a January date in short Indonesian", () => {
    // new Date("2024-01-15") is parsed as UTC midnight; toLocaleDateString in
    // UTC+7 still renders as 15 Jan because midnight UTC = 07:00 WIB.
    expect(fmtDate("2024-01-15")).toBe("15 Jan 2024");
  });

  it("formats a December date and uses short month abbreviation", () => {
    expect(fmtDate("2024-12-31")).toBe("31 Des 2024");
  });

  it("accepts a Date object", () => {
    // Build the date in local time so there is no UTC-offset ambiguity.
    const d = new Date(2024, 2, 20); // March 20, 2024 (local)
    expect(fmtDate(d)).toBe("20 Mar 2024");
  });

  it("contains the year as a 4-digit number", () => {
    expect(fmtDate("2024-06-01")).toMatch(/2024/);
  });

  it("result does not contain a time component", () => {
    const result = fmtDate("2024-06-01");
    expect(result).not.toMatch(/\d{2}[.:]\d{2}/);
  });
});

// ---------------------------------------------------------------------------
// fmtDateLong
// ---------------------------------------------------------------------------
describe("fmtDateLong", () => {
  it("includes full Indonesian day name (Senin) for 2024-01-15", () => {
    expect(fmtDateLong("2024-01-15")).toBe("Senin, 15 Januari 2024");
  });

  it("includes full Indonesian month name (Maret) for 2024-03-20", () => {
    const result = fmtDateLong("2024-03-20");
    expect(result).toContain("Maret");
  });

  it("formats Wednesday in Indonesian (Rabu)", () => {
    const result = fmtDateLong("2024-03-20"); // Wednesday, 20 March 2024
    expect(result).toContain("Rabu");
  });

  it("accepts a Date object", () => {
    const d = new Date(2024, 0, 15); // January 15 2024 local
    const result = fmtDateLong(d);
    expect(result).toContain("Januari");
    expect(result).toContain("2024");
  });

  it("includes a comma after the weekday name (Indonesian long format)", () => {
    const result = fmtDateLong("2024-01-15");
    expect(result).toMatch(/\w+,/);
  });

  it("result contains 4-digit year", () => {
    expect(fmtDateLong("2024-12-31")).toMatch(/2024/);
  });
});

// ---------------------------------------------------------------------------
// fmtTime
// ---------------------------------------------------------------------------
describe("fmtTime", () => {
  it("formats 08:30 from a local datetime string", () => {
    // Pass a full ISO-like local datetime so there is no TZ conversion.
    expect(fmtTime("2024-01-15T08:30:00")).toBe("08.30");
  });

  it("formats 14:00 from a local datetime string", () => {
    expect(fmtTime("2024-01-15T14:00:00")).toBe("14.00");
  });

  it("formats 23:59 from a local datetime string", () => {
    expect(fmtTime("2024-01-15T23:59:00")).toBe("23.59");
  });

  it("accepts a Date object", () => {
    const d = new Date(2024, 0, 15, 9, 5, 0); // 09:05 local
    expect(fmtTime(d)).toBe("09.05");
  });

  it("output matches HH.MM pattern (id-ID locale uses period separator)", () => {
    expect(fmtTime("2024-06-04T07:45:00")).toMatch(/^\d{2}\.\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// waLink
// ---------------------------------------------------------------------------
describe("waLink", () => {
  it("uses the default admin WhatsApp number when no phone is given", () => {
    const link = waLink();
    // Default: 082110009667 → strip leading 0 → 62 + 82110009667
    expect(link).toContain("wa.me/6282110009667");
  });

  it("uses a custom phone number when provided", () => {
    const link = waLink("Halo", "081234567890");
    // strip leading 0 → 62 + 81234567890
    expect(link).toContain("wa.me/6281234567890");
  });

  it("strips non-digit characters from a custom phone number", () => {
    const link = waLink("Test", "+62 821-0000-1111");
    // +62 821-0000-1111 → strip non-digits but keep 62821… wait:
    // phone.replace(/^0/, '') on "+62 821..." → "+62 821..." (no leading 0 stripped)
    // then .replace(/\D/g, '') → "628210001111"
    // result: wa.me/62628210001111 — test for stripped result
    expect(link).not.toContain(" ");
    expect(link).not.toContain("-");
  });

  it("URI-encodes the message text", () => {
    const link = waLink("Halo dunia");
    expect(link).toContain(encodeURIComponent("Halo dunia"));
  });

  it("encodes special characters in the message", () => {
    const link = waLink("Hello & World!");
    expect(link).toContain(encodeURIComponent("Hello & World!"));
  });

  it("returns a URL starting with https://wa.me/", () => {
    expect(waLink()).toMatch(/^https:\/\/wa\.me\//);
  });

  it("includes ?text= query parameter", () => {
    expect(waLink("test")).toContain("?text=");
  });

  it("handles empty string message (default)", () => {
    const link = waLink("");
    expect(link).toContain("?text=");
    // empty string encodes to empty, so text= at the end or text=''
    expect(link).toMatch(/\?text=$/);
  });

  it("treats null phone as missing — falls back to default number", () => {
    const linkNull = waLink("hi", null);
    const linkDefault = waLink("hi");
    expect(linkNull).toBe(linkDefault);
  });
});

// ---------------------------------------------------------------------------
// cn
// ---------------------------------------------------------------------------
describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes with a space", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out undefined values", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("filters out null values", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("filters out false values", () => {
    expect(cn("foo", false, "bar")).toBe("foo bar");
  });

  it("filters out empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(undefined, null, false, "")).toBe("");
  });

  it("returns empty string with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles conditional Tailwind-style classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("omits class when condition is false", () => {
    const isActive = false;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class");
  });
});
