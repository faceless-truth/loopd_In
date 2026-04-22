import { describe, expect, it } from "vitest";
import { computeStreak } from "../server/streak";

// Helper to build a Date at local midnight.
function day(y: number, m: number, d: number, h = 12): Date {
  // m is 1-indexed for readability; convert to JS 0-indexed month.
  return new Date(y, m - 1, d, h, 0, 0, 0);
}

describe("computeStreak — daily", () => {
  const daily = { frequencyType: "daily" as const, customDays: null };

  it("returns 0 when no logs exist", () => {
    expect(computeStreak([], daily, day(2026, 4, 22))).toBe(0);
  });

  it("counts one day when only today is logged", () => {
    expect(
      computeStreak([day(2026, 4, 22)], daily, day(2026, 4, 22)),
    ).toBe(1);
  });

  it("counts yesterday when today is not yet logged (grace)", () => {
    expect(
      computeStreak([day(2026, 4, 21)], daily, day(2026, 4, 22)),
    ).toBe(1);
  });

  it("counts a 3-day consecutive run ending today", () => {
    const logs = [day(2026, 4, 22), day(2026, 4, 21), day(2026, 4, 20)];
    expect(computeStreak(logs, daily, day(2026, 4, 22))).toBe(3);
  });

  it("breaks at the first missing day", () => {
    // logs on 20, 22 — missing 21 — streak counts only today.
    const logs = [day(2026, 4, 22), day(2026, 4, 20)];
    expect(computeStreak(logs, daily, day(2026, 4, 22))).toBe(1);
  });

  it("returns 0 when neither today nor yesterday is logged", () => {
    const logs = [day(2026, 4, 15)];
    expect(computeStreak(logs, daily, day(2026, 4, 22))).toBe(0);
  });
});

describe("computeStreak — custom_days (Mon/Wed/Fri: 0,2,4)", () => {
  const mwf = { frequencyType: "custom_days" as const, customDays: "0,2,4" };

  // Reference: 2026-04-22 is a Wednesday (verify mentally; test with getDay).
  it("sanity: 2026-04-22 is a Wednesday", () => {
    expect(day(2026, 4, 22).getDay()).toBe(3); // JS Wed=3
  });

  it("counts 1 when today (Wed) is logged", () => {
    expect(
      computeStreak([day(2026, 4, 22)], mwf, day(2026, 4, 22)),
    ).toBe(1);
  });

  it("counts 3 for Mon/Wed/Fri all logged in the same week (ending Wed)", () => {
    // Mon 2026-04-20, Wed 2026-04-22. Today = Wed. Prev scheduled = Mon (20),
    // before that Fri 2026-04-17.
    const logs = [
      day(2026, 4, 22), // Wed
      day(2026, 4, 20), // Mon
      day(2026, 4, 17), // Fri
    ];
    expect(computeStreak(logs, mwf, day(2026, 4, 22))).toBe(3);
  });

  it("skipping non-scheduled days (Tue/Thu) does not break the streak", () => {
    // Logged Mon/Wed only. Tue was not scheduled so it doesn't matter.
    const logs = [day(2026, 4, 22), day(2026, 4, 20)];
    expect(computeStreak(logs, mwf, day(2026, 4, 22))).toBe(2);
  });

  it("missing a scheduled day breaks the streak", () => {
    // Today (Wed) logged; last Friday (17) NOT logged; Mon (20) logged.
    // Walk: Wed (logged, +1) → Mon (logged, +1) → Fri 17 (not logged, break).
    const logs = [day(2026, 4, 22), day(2026, 4, 20)];
    expect(computeStreak(logs, mwf, day(2026, 4, 22))).toBe(2);
  });

  it("today is scheduled but not logged → starts from previous scheduled day", () => {
    // Today = Wed (scheduled, not logged). Mon (20) logged, Fri (17) logged.
    const logs = [day(2026, 4, 20), day(2026, 4, 17)];
    expect(computeStreak(logs, mwf, day(2026, 4, 22))).toBe(2);
  });

  it("today is not scheduled (Thu) → walks back to the most recent scheduled day", () => {
    // Today = Thu 2026-04-23 (Thu is not in MWF). Wed logged, Mon logged.
    const logs = [day(2026, 4, 22), day(2026, 4, 20)];
    expect(computeStreak(logs, mwf, day(2026, 4, 23))).toBe(2);
  });

  it("returns 0 when customDays CSV is empty", () => {
    const empty = { frequencyType: "custom_days" as const, customDays: "" };
    expect(
      computeStreak([day(2026, 4, 22)], empty, day(2026, 4, 22)),
    ).toBe(0);
  });

  it("returns 0 when customDays CSV is null", () => {
    const noDays = { frequencyType: "custom_days" as const, customDays: null };
    expect(
      computeStreak([day(2026, 4, 22)], noDays, day(2026, 4, 22)),
    ).toBe(0);
  });
});

describe("computeStreak — weekly (rolling 7-day window)", () => {
  const weekly = { frequencyType: "weekly" as const, customDays: null };

  it("one log this week → streak 1", () => {
    expect(
      computeStreak([day(2026, 4, 20)], weekly, day(2026, 4, 22)),
    ).toBe(1);
  });

  it("two consecutive weekly windows both covered → streak 2", () => {
    // today = 2026-04-22. Window 1 = [04-16, 04-22]. Window 2 = [04-09, 04-15].
    const logs = [day(2026, 4, 20), day(2026, 4, 12)];
    expect(computeStreak(logs, weekly, day(2026, 4, 22))).toBe(2);
  });

  it("gap of 10 days between logs → streak 1 (second window empty)", () => {
    // today = 2026-04-22. Logs only at 04-20 and 04-08. Window 2 = [04-09, 04-15] has no log.
    const logs = [day(2026, 4, 20), day(2026, 4, 8)];
    expect(computeStreak(logs, weekly, day(2026, 4, 22))).toBe(1);
  });

  it("no logs → streak 0", () => {
    expect(computeStreak([], weekly, day(2026, 4, 22))).toBe(0);
  });

  it("log exactly 7 days ago (window boundary) counts for window 1", () => {
    // today = 2026-04-22. Window 1 = [04-16, 04-22]. Log at 04-16 is inside.
    expect(
      computeStreak([day(2026, 4, 16)], weekly, day(2026, 4, 22)),
    ).toBe(1);
  });
});
