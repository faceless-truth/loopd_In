import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Extended user profile (display name, username handle, avatar).
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  displayName: varchar("displayName", { length: 64 }).notNull(),
  avatarUrl: text("avatarUrl"),
  bio: varchar("bio", { length: 160 }),
  pushToken: varchar("push_token", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Habits defined by users.
 */
export const habits = mysqlTable("habits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  category: varchar("category", { length: 32 }),
  frequencyType: mysqlEnum("frequencyType", ["daily", "weekly", "custom_days"])
    .default("daily")
    .notNull(),
  customDays: varchar("customDays", { length: 20 }),
  targetType: mysqlEnum("targetType", ["boolean", "numeric"])
    .default("boolean")
    .notNull(),
  targetValue: int("targetValue").default(1).notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  // Time-of-day scheduling
  timeOfDay: mysqlEnum("timeOfDay", ["any_time", "morning", "afternoon", "nighttime", "custom"])
    .default("any_time")
    .notNull(),
  customTime: varchar("customTime", { length: 5 }), // HH:MM format, e.g. "08:30"
  // Sub-goal steps for numeric habits (e.g. 3 steps of 1L each for a 3L water goal)
  subGoalSteps: int("subGoalSteps").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = typeof habits.$inferInsert;

/**
 * Habit completion events (logs).
 */
export const habitLogs = mysqlTable("habit_logs", {
  id: int("id").autoincrement().primaryKey(),
  habitId: int("habitId").notNull(),
  userId: int("userId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  value: int("value").default(1).notNull(),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = typeof habitLogs.$inferInsert;

/**
 * Friendships between users.
 */
export const friendships = mysqlTable(
  "friendships",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    friendId: int("friendId").notNull(),
    status: mysqlEnum("status", ["pending", "accepted"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    userId_friendId_unique: unique("friendships_userId_friendId_unique").on(
      t.userId,
      t.friendId,
    ),
  }),
);

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

/**
 * Emoji reactions on habit logs.
 */
export const reactions = mysqlTable("reactions", {
  id: int("id").autoincrement().primaryKey(),
  logId: int("logId").notNull(),
  userId: int("userId").notNull(),
  emoji: varchar("emoji", { length: 8 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = typeof reactions.$inferInsert;

/**
 * Text comments on habit logs.
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  logId: int("logId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Challenges: group accountability goals with leaderboard.
 */
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  metric: varchar("metric", { length: 128 }).notNull(), // e.g. "10,000 steps per day"
  targetValue: int("targetValue").default(1).notNull(),
  targetType: mysqlEnum("targetType", ["boolean", "numeric"]).default("boolean").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;

/**
 * Challenge participants (members + their progress).
 */
export const challengeParticipants = mysqlTable("challenge_participants", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  userId: int("userId").notNull(),
  habitId: int("habitId"), // auto-created habit linked to this challenge
  completionCount: int("completionCount").default(0).notNull(),
  status: mysqlEnum("status", ["invited", "joined", "declined"]).default("invited").notNull(),
  joinedAt: timestamp("joinedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type InsertChallengeParticipant = typeof challengeParticipants.$inferInsert;

/**
 * Food logs: meal photos + AI breakdown (opt-in feature).
 */
export const foodLogs = mysqlTable("food_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mealType: mysqlEnum("mealType", ["breakfast", "lunch", "dinner", "snack"]).notNull(),
  photoUrl: text("photoUrl"),
  aiSummary: text("aiSummary"), // JSON string with macros/description from LLM
  notes: text("notes"),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = typeof foodLogs.$inferInsert;

/**
 * User settings (feature toggles like food photo opt-in).
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  foodPhotoEnabled: boolean("foodPhotoEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
