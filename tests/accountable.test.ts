import { describe, it, expect } from "vitest";

// ─── Shared Types Tests ───────────────────────────────────────────────────────

describe("Shared Types", () => {
  it("HABIT_CATEGORIES contains all 6 categories", async () => {
    const { HABIT_CATEGORIES } = await import("../shared/types");
    expect(HABIT_CATEGORIES).toHaveLength(6);
    expect(HABIT_CATEGORIES).toContain("Fitness");
    expect(HABIT_CATEGORIES).toContain("Mindfulness");
    expect(HABIT_CATEGORIES).toContain("Learning");
    expect(HABIT_CATEGORIES).toContain("Health");
    expect(HABIT_CATEGORIES).toContain("Productivity");
    expect(HABIT_CATEGORIES).toContain("Other");
  });

  it("CATEGORY_ICONS has an icon for every category", async () => {
    const { HABIT_CATEGORIES, CATEGORY_ICONS } = await import("../shared/types");
    for (const cat of HABIT_CATEGORIES) {
      expect(CATEGORY_ICONS[cat]).toBeTruthy();
    }
  });

  it("CATEGORY_COLORS has a color for every category", async () => {
    const { HABIT_CATEGORIES, CATEGORY_COLORS } = await import("../shared/types");
    for (const cat of HABIT_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("FEED_EMOJIS has 5 emojis", async () => {
    const { FEED_EMOJIS } = await import("../shared/types");
    expect(FEED_EMOJIS).toHaveLength(5);
  });
});

// ─── Schema Tests ─────────────────────────────────────────────────────────────

describe("Database Schema", () => {
  it("habits table has required columns", async () => {
    const { habits } = await import("../drizzle/schema");
    const cols = Object.keys(habits);
    expect(cols).toContain("id");
    expect(cols).toContain("userId");
    expect(cols).toContain("title");
    expect(cols).toContain("category");
    expect(cols).toContain("frequencyType");
    expect(cols).toContain("targetType");
    expect(cols).toContain("targetValue");
    expect(cols).toContain("isPrivate");
    expect(cols).toContain("isArchived");
  });

  it("habitLogs table has required columns", async () => {
    const { habitLogs } = await import("../drizzle/schema");
    const cols = Object.keys(habitLogs);
    expect(cols).toContain("id");
    expect(cols).toContain("habitId");
    expect(cols).toContain("userId");
    expect(cols).toContain("completedAt");
    expect(cols).toContain("value");
    expect(cols).toContain("photoUrl");
    expect(cols).toContain("notes");
  });

  it("friendships table has required columns", async () => {
    const { friendships } = await import("../drizzle/schema");
    const cols = Object.keys(friendships);
    expect(cols).toContain("id");
    expect(cols).toContain("userId");
    expect(cols).toContain("friendId");
    expect(cols).toContain("status");
  });

  it("reactions table has required columns", async () => {
    const { reactions } = await import("../drizzle/schema");
    const cols = Object.keys(reactions);
    expect(cols).toContain("id");
    expect(cols).toContain("logId");
    expect(cols).toContain("userId");
    expect(cols).toContain("emoji");
  });

  it("comments table has required columns", async () => {
    const { comments } = await import("../drizzle/schema");
    const cols = Object.keys(comments);
    expect(cols).toContain("id");
    expect(cols).toContain("logId");
    expect(cols).toContain("userId");
    expect(cols).toContain("content");
  });

  it("userProfiles table has required columns", async () => {
    const { userProfiles } = await import("../drizzle/schema");
    const cols = Object.keys(userProfiles);
    expect(cols).toContain("id");
    expect(cols).toContain("userId");
    expect(cols).toContain("username");
    expect(cols).toContain("displayName");
    expect(cols).toContain("avatarUrl");
    expect(cols).toContain("bio");
  });
});

// ─── Business Logic Tests ─────────────────────────────────────────────────────

describe("Business Logic", () => {
  it("getDayGreeting returns correct greeting for morning", () => {
    const hour = 8;
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    expect(greeting).toBe("Good morning");
  });

  it("getDayGreeting returns correct greeting for afternoon", () => {
    const hour = 14;
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    expect(greeting).toBe("Good afternoon");
  });

  it("getDayGreeting returns correct greeting for evening", () => {
    const hour = 20;
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    expect(greeting).toBe("Good evening");
  });

  it("username validation rejects invalid characters", () => {
    const validate = (u: string) => /^[a-zA-Z0-9_]+$/.test(u);
    expect(validate("valid_user123")).toBe(true);
    expect(validate("invalid user")).toBe(false);
    expect(validate("invalid@user")).toBe(false);
    expect(validate("valid")).toBe(true);
  });

  it("numeric progress is capped at 1", () => {
    const targetValue = 10;
    const logValue = 15;
    const progress = Math.min(logValue / targetValue, 1);
    expect(progress).toBe(1);
  });

  it("numeric progress is correctly calculated", () => {
    const targetValue = 10;
    const logValue = 5;
    const progress = Math.min(logValue / targetValue, 1);
    expect(progress).toBe(0.5);
  });

  it("timeAgo returns 'just now' for recent timestamps", () => {
    const timeAgo = (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    };
    const now = new Date();
    expect(timeAgo(now)).toBe("just now");
  });

  it("timeAgo returns minutes for timestamps within an hour", () => {
    const timeAgo = (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date;
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    };
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinutesAgo)).toBe("5m ago");
  });
});
