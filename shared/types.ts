/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

export type HabitCategory =
  | "Fitness"
  | "Mindfulness"
  | "Learning"
  | "Health"
  | "Productivity"
  | "Other";

export const HABIT_CATEGORIES: HabitCategory[] = [
  "Fitness",
  "Mindfulness",
  "Learning",
  "Health",
  "Productivity",
  "Other",
];

export const CATEGORY_ICONS: Record<HabitCategory, string> = {
  Fitness: "🏃",
  Mindfulness: "🧘",
  Learning: "📚",
  Health: "💊",
  Productivity: "⚡",
  Other: "✨",
};

export const CATEGORY_COLORS: Record<HabitCategory, string> = {
  Fitness: "#FF5C00",
  Mindfulness: "#8B5CF6",
  Learning: "#3B82F6",
  Health: "#22C55E",
  Productivity: "#F59E0B",
  Other: "#6B7280",
};

export const FEED_EMOJIS = ["🔥", "❤️", "💪", "👏", "✨"];

export const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
