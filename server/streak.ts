import type { Habit } from "../drizzle/schema";
import { jsDayToMondayFirst, parseCustomDaysCsv } from "../shared/day-of-week";

/**
 * Pure, database-free streak calculator.
 *
 * All date math is performed in the runtime's local timezone — same as
 * today's getHabitStreak. Phase 3 will retrofit a timezone parameter.
 *
 * "Today" is the reference date passed in (so tests can pin the clock).
 */

type FrequencyType = Habit["frequencyType"];
type Rule = {
  frequencyType: FrequencyType;
  customDays: string | null;
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Floor `date` to midnight in local time, returning a new Date.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute the current streak for a habit given its raw log timestamps.
 *
 * Semantics per frequencyType:
 *
 * - `daily`: streak = consecutive calendar days ending today (or
 *   yesterday if today has no log) where ≥1 log exists.
 *
 * - `custom_days`: streak = consecutive **scheduled** days ending at or
 *   before today where ≥1 log exists on that day. Non-scheduled days
 *   are skipped (they neither count nor break the streak). Starting
 *   from today, walk backwards through scheduled days only.
 *
 * - `weekly`: streak = consecutive rolling 7-day windows ending today
 *   where ≥1 log exists in that window. Each window is `[t-6d, t]`
 *   inclusive on the day granularity; the next window back is
 *   `[t-13d, t-7d]`, etc. Missing a window breaks the streak.
 */
export function computeStreak(
  logDates: readonly Date[],
  rule: Rule,
  today: Date,
): number {
  if (logDates.length === 0) return 0;

  const logDayKeys = new Set<string>();
  for (const d of logDates) {
    logDayKeys.add(dateKey(startOfDay(d)));
  }

  const startToday = startOfDay(today);

  if (rule.frequencyType === "weekly") {
    return computeWeeklyStreak(logDates, startToday);
  }

  if (rule.frequencyType === "custom_days") {
    return computeCustomDaysStreak(logDayKeys, rule.customDays, startToday);
  }

  // daily (default)
  return computeDailyStreak(logDayKeys, startToday);
}

function computeDailyStreak(
  logDayKeys: Set<string>,
  startToday: Date,
): number {
  const cursor = new Date(startToday);
  if (!logDayKeys.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (logDayKeys.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeCustomDaysStreak(
  logDayKeys: Set<string>,
  customDaysCsv: string | null,
  startToday: Date,
): number {
  const scheduled = parseCustomDaysCsv(customDaysCsv);
  if (scheduled.size === 0) return 0;

  // Walk backwards one day at a time; only scheduled days can advance
  // or break the streak. We look back up to ~2 weeks for the first
  // scheduled day (the earliest scheduled day in a 7-day window) so a
  // habit checked today doesn't need to start from today to have a
  // streak. Hard cap prevents infinite walk if something unexpected.
  const cursor = new Date(startToday);
  let streak = 0;
  let scannedScheduled = 0;
  // Look-back cap: 10 years of scheduled days is way more than any
  // real user streak but keeps the loop safely bounded.
  const maxScheduledDays = 3650;

  // If today is scheduled but not logged, start from the previous
  // scheduled day (mirrors the daily "grace today" behaviour).
  const todayIdx = jsDayToMondayFirst(cursor.getDay());
  const todayIsScheduled = scheduled.has(todayIdx);
  const todayIsLogged = logDayKeys.has(dateKey(cursor));
  if (todayIsScheduled && !todayIsLogged) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (scannedScheduled < maxScheduledDays) {
    const idx = jsDayToMondayFirst(cursor.getDay());
    if (scheduled.has(idx)) {
      if (logDayKeys.has(dateKey(cursor))) {
        streak += 1;
      } else {
        break;
      }
      scannedScheduled += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function computeWeeklyStreak(
  logDates: readonly Date[],
  startToday: Date,
): number {
  // Rolling 7-day windows ending today: [today-6d, today], then
  // [today-13d, today-7d], etc. A window "has a log" if any logDate
  // falls inside it (day-granular).
  const logDays: Date[] = logDates.map(startOfDay);

  let windowEnd = new Date(startToday);
  let streak = 0;
  // Bound: ten years of weeks.
  for (let i = 0; i < 520; i += 1) {
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 6);
    const hasLog = logDays.some(
      (d) => d.getTime() >= windowStart.getTime() && d.getTime() <= windowEnd.getTime(),
    );
    if (!hasLog) break;
    streak += 1;
    windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() - 1);
  }
  return streak;
}
