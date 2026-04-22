import type { Habit, HabitLog } from "../drizzle/schema";

/**
 * Pure helpers for reasoning about a habit's day-level progress.
 *
 * Numeric habits can accumulate multiple log rows per day (one per
 * sub-goal step). The UI and the completion-guard logic must sum those
 * logs rather than inspect a single row.
 */

type HabitLike = Pick<Habit, "targetType" | "targetValue" | "subGoalSteps">;

/**
 * Sum the `value` of every log in `logs` whose habitId matches.
 * Returns 0 when logs is undefined.
 */
export function sumTodayValue(
  logs: readonly HabitLog[] | undefined,
  habitId: number,
): number {
  if (!logs) return 0;
  let total = 0;
  for (const log of logs) {
    if (log.habitId === habitId) total += log.value;
  }
  return total;
}

/**
 * Per-tap increment for the completion button.
 *
 * - boolean habit: always 1 (a single tap satisfies the habit).
 * - numeric habit with 1 step: targetValue (one tap logs the full amount).
 * - numeric habit with N steps: ceil(targetValue / N), clamped to ≥ 1.
 *
 * Ceiling, not floor, so a 10-count / 4-step habit lands in 4 taps of 3
 * (12 ≥ 10) instead of 4 taps of 2 (8 < 10).
 */
export function stepValueForHabit(habit: HabitLike): number {
  if (habit.targetType !== "numeric") return 1;
  const steps = habit.subGoalSteps ?? 1;
  if (steps <= 1) return Math.max(1, habit.targetValue);
  return Math.max(1, Math.ceil(habit.targetValue / steps));
}

/**
 * Is the habit satisfied today, given the day's logs?
 *
 * - boolean: at least one log.
 * - numeric: cumulative value ≥ targetValue.
 *
 * Overshoot is fine (sum > target still counts as completed).
 */
export function isHabitCompletedToday(
  habit: HabitLike,
  logs: readonly HabitLog[] | undefined,
  habitId: number,
): boolean {
  const total = sumTodayValue(logs, habitId);
  if (habit.targetType === "boolean") return total >= 1;
  return total >= habit.targetValue;
}
