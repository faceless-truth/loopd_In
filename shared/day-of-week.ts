/**
 * Day-of-week convention shared by the custom-days habit picker, the
 * server-side streak calculator, and any today-filter logic.
 *
 * Index convention: **Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6**.
 * Matches the existing `DAYS_OF_WEEK` array in shared/types.ts. Use
 * `jsDayToMondayFirst(date.getDay())` to convert from JavaScript's
 * Sun=0 convention.
 *
 * Storage format for `habits.customDays`: a comma-separated list of
 * indices, e.g. "0,2,4" for Mon/Wed/Fri. Empty string and null both
 * mean "no days selected".
 */

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const VALID: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6]);

/**
 * Convert a JavaScript Date.getDay() value (Sun=0 … Sat=6) to the
 * Mon-first convention used for customDays storage.
 */
export function jsDayToMondayFirst(jsDay: number): DayIndex {
  // Sun=0 (JS) → 6 (Mon-first). Otherwise jsDay - 1.
  const v = jsDay === 0 ? 6 : jsDay - 1;
  return v as DayIndex;
}

/**
 * Parse a customDays CSV into a Set of valid day indices.
 * - null / undefined / empty string → empty set
 * - duplicates are collapsed
 * - non-numeric or out-of-range tokens are ignored
 */
export function parseCustomDaysCsv(
  csv: string | null | undefined,
): Set<DayIndex> {
  const out = new Set<DayIndex>();
  if (!csv) return out;
  for (const token of csv.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const n = Number(trimmed);
    if (Number.isInteger(n) && VALID.has(n)) out.add(n as DayIndex);
  }
  return out;
}

/**
 * Format a set of day indices back into the canonical CSV storage
 * form. Always emits sorted, unique, comma-separated integers.
 */
export function formatCustomDaysCsv(days: Iterable<number>): string {
  const set = new Set<DayIndex>();
  for (const d of days) {
    if (Number.isInteger(d) && VALID.has(d)) set.add(d as DayIndex);
  }
  return Array.from(set).sort((a, b) => a - b).join(",");
}
