import { describe, expect, it } from "vitest";
import {
  formatCustomDaysCsv,
  jsDayToMondayFirst,
  parseCustomDaysCsv,
} from "../shared/day-of-week";

describe("jsDayToMondayFirst", () => {
  it("maps Sun=0 (JS) to 6 (Mon-first)", () => {
    expect(jsDayToMondayFirst(0)).toBe(6);
  });

  it("maps Mon=1 (JS) to 0 (Mon-first)", () => {
    expect(jsDayToMondayFirst(1)).toBe(0);
  });

  it("maps Sat=6 (JS) to 5 (Mon-first)", () => {
    expect(jsDayToMondayFirst(6)).toBe(5);
  });

  it("round-trips every JS day to a distinct Mon-first index", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 7; i += 1) seen.add(jsDayToMondayFirst(i));
    expect(seen.size).toBe(7);
  });
});

describe("parseCustomDaysCsv", () => {
  it("returns empty for null/undefined/empty", () => {
    expect(parseCustomDaysCsv(null).size).toBe(0);
    expect(parseCustomDaysCsv(undefined).size).toBe(0);
    expect(parseCustomDaysCsv("").size).toBe(0);
  });

  it("parses Mon/Wed/Fri as [0,2,4]", () => {
    const set = parseCustomDaysCsv("0,2,4");
    expect(Array.from(set).sort()).toEqual([0, 2, 4]);
  });

  it("tolerates whitespace and trailing commas", () => {
    const set = parseCustomDaysCsv(" 1 , 3 , ");
    expect(Array.from(set).sort()).toEqual([1, 3]);
  });

  it("collapses duplicates", () => {
    const set = parseCustomDaysCsv("2,2,2");
    expect(Array.from(set)).toEqual([2]);
  });

  it("drops out-of-range and non-numeric tokens", () => {
    const set = parseCustomDaysCsv("0,7,-1,abc,3");
    expect(Array.from(set).sort()).toEqual([0, 3]);
  });
});

describe("formatCustomDaysCsv", () => {
  it("produces sorted, comma-joined indices", () => {
    expect(formatCustomDaysCsv([4, 0, 2])).toBe("0,2,4");
  });

  it("round-trips with parseCustomDaysCsv", () => {
    const csv = "1,3,5";
    const parsed = parseCustomDaysCsv(csv);
    expect(formatCustomDaysCsv(parsed)).toBe(csv);
  });

  it("emits empty string for empty input", () => {
    expect(formatCustomDaysCsv([])).toBe("");
  });

  it("drops duplicates and invalid values", () => {
    expect(formatCustomDaysCsv([0, 0, 99, -1, 3])).toBe("0,3");
  });
});
