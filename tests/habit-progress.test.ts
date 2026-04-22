import { describe, expect, it } from "vitest";
import type { Habit, HabitLog } from "../drizzle/schema";
import {
  isHabitCompletedToday,
  stepValueForHabit,
  sumTodayValue,
} from "../shared/habit-progress";

function makeLog(habitId: number, value: number, id = 0): HabitLog {
  return {
    id,
    habitId,
    userId: 1,
    completedAt: new Date(),
    value,
    photoUrl: null,
    notes: null,
    createdAt: new Date(),
  };
}

type HabitLike = Pick<Habit, "targetType" | "targetValue" | "subGoalSteps">;

const boolHabit: HabitLike = { targetType: "boolean", targetValue: 1, subGoalSteps: 1 };
const numericSingleStep: HabitLike = { targetType: "numeric", targetValue: 3, subGoalSteps: 1 };
const water3L: HabitLike = { targetType: "numeric", targetValue: 3, subGoalSteps: 3 };
const count10of4: HabitLike = { targetType: "numeric", targetValue: 10, subGoalSteps: 4 };
const tiny1of3: HabitLike = { targetType: "numeric", targetValue: 1, subGoalSteps: 3 };

describe("sumTodayValue", () => {
  it("returns 0 for undefined logs", () => {
    expect(sumTodayValue(undefined, 5)).toBe(0);
  });

  it("returns 0 when no log matches the habitId", () => {
    expect(sumTodayValue([makeLog(2, 5)], 5)).toBe(0);
  });

  it("sums multiple logs for the same habit", () => {
    expect(sumTodayValue([makeLog(5, 1), makeLog(5, 1), makeLog(5, 1)], 5)).toBe(3);
  });

  it("ignores logs belonging to other habits", () => {
    expect(
      sumTodayValue([makeLog(5, 2), makeLog(9, 100), makeLog(5, 3)], 5),
    ).toBe(5);
  });
});

describe("stepValueForHabit", () => {
  it("returns 1 for boolean habits", () => {
    expect(stepValueForHabit(boolHabit)).toBe(1);
  });

  it("returns targetValue for numeric single-step habits", () => {
    expect(stepValueForHabit(numericSingleStep)).toBe(3);
  });

  it("divides target evenly across sub-goal steps", () => {
    expect(stepValueForHabit(water3L)).toBe(1);
  });

  it("rounds up when division is uneven (10/4 → 3)", () => {
    expect(stepValueForHabit(count10of4)).toBe(3);
  });

  it("clamps step value to at least 1 when target < steps", () => {
    expect(stepValueForHabit(tiny1of3)).toBe(1);
  });

  it("treats missing subGoalSteps as a single step", () => {
    expect(
      stepValueForHabit({
        targetType: "numeric",
        targetValue: 7,
        subGoalSteps: undefined as unknown as number,
      }),
    ).toBe(7);
  });
});

describe("isHabitCompletedToday", () => {
  it("boolean habit: one log satisfies", () => {
    expect(isHabitCompletedToday(boolHabit, [makeLog(5, 1)], 5)).toBe(true);
  });

  it("boolean habit: no logs → not completed", () => {
    expect(isHabitCompletedToday(boolHabit, [], 5)).toBe(false);
  });

  it("numeric habit: sum below target → not completed", () => {
    expect(
      isHabitCompletedToday(water3L, [makeLog(5, 1), makeLog(5, 1)], 5),
    ).toBe(false);
  });

  it("numeric habit: sum equals target → completed", () => {
    expect(
      isHabitCompletedToday(
        water3L,
        [makeLog(5, 1), makeLog(5, 1), makeLog(5, 1)],
        5,
      ),
    ).toBe(true);
  });

  it("numeric habit: overshoot still counts as completed", () => {
    expect(
      isHabitCompletedToday(water3L, [makeLog(5, 2), makeLog(5, 2)], 5),
    ).toBe(true);
  });

  it("numeric habit: logs of other habits ignored", () => {
    expect(
      isHabitCompletedToday(
        water3L,
        [makeLog(9, 100), makeLog(5, 1)],
        5,
      ),
    ).toBe(false);
  });
});
