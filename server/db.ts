import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Challenge,
  ChallengeParticipant,
  Comment,
  Friendship,
  Habit,
  HabitLog,
  InsertComment,
  InsertFriendship,
  InsertHabit,
  InsertHabitLog,
  InsertReaction,
  InsertUser,
  InsertUserProfile,
  Reaction,
  UserProfile,
  challengeParticipants,
  challenges,
  comments,
  foodLogs,
  friendships,
  habitLogs,
  habits,
  reactions,
  userProfiles,
  userSettings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { computeStreak } from "./streak";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number): Promise<UserProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function getUserProfileByUsername(username: string): Promise<UserProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.username, username)).limit(1);
  return result[0];
}

export async function upsertUserProfile(data: InsertUserProfile): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userProfiles).values(data).onDuplicateKeyUpdate({
    set: { displayName: data.displayName, avatarUrl: data.avatarUrl, bio: data.bio },
  });
}

export async function savePushToken(userId: number, pushToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userProfiles).set({ pushToken }).where(eq(userProfiles.userId, userId));
}

export async function getPushToken(userId: number): Promise<string | null | undefined> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ pushToken: userProfiles.pushToken }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0]?.pushToken;
}

export async function searchUserProfiles(query: string, excludeUserId: number): Promise<UserProfile[]> {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select().from(userProfiles).limit(50);
  return results.filter(
    (p) => p.userId !== excludeUserId &&
      (p.username.toLowerCase().includes(query.toLowerCase()) ||
        p.displayName.toLowerCase().includes(query.toLowerCase()))
  );
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export async function getUserHabits(userId: number): Promise<Habit[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(habits).where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));
}
export async function getHabitById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(habits).where(eq(habits.id, id));
  return rows[0] ?? null;
}

export async function createHabit(data: InsertHabit): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(habits).values(data);
  return (result as any)[0].insertId ?? 0;
}

export async function updateHabit(id: number, userId: number, data: Partial<InsertHabit>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(habits).set(data).where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

export async function deleteHabit(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(habits).set({ isArchived: true }).where(and(eq(habits.id, id), eq(habits.userId, userId)));
}

// ─── Habit Logs ───────────────────────────────────────────────────────────────

export async function logHabitCompletion(data: InsertHabitLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(habitLogs).values(data);
  return (result as any)[0].insertId ?? 0;
}

export async function getTodayLogs(userId: number): Promise<HabitLog[]> {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const allLogs = await db.select().from(habitLogs).where(eq(habitLogs.userId, userId));
  return allLogs.filter((log) => log.completedAt >= today && log.completedAt < tomorrow);
}

export async function getHabitLogs(habitId: number, limit = 30): Promise<HabitLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(habitLogs).where(eq(habitLogs.habitId, habitId)).orderBy(desc(habitLogs.completedAt)).limit(limit);
}

export async function updateHabitLogPhoto(logId: number, photoUrl: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(habitLogs).set({ photoUrl }).where(eq(habitLogs.id, logId));
}

// ─── Social Feed ──────────────────────────────────────────────────────────────

export async function getFeedForUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];

  const friendRows = await db.select().from(friendships).where(
    and(
      or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
      eq(friendships.status, "accepted")
    )
  );
  const friendIds = friendRows.map((f) => (f.userId === userId ? f.friendId : f.userId));
  if (friendIds.length === 0) return [];

  const logs = await db
    .select({ log: habitLogs, habit: habits, profile: userProfiles })
    .from(habitLogs)
    .innerJoin(habits, eq(habitLogs.habitId, habits.id))
    .innerJoin(userProfiles, eq(habitLogs.userId, userProfiles.userId))
    .where(and(inArray(habitLogs.userId, friendIds), eq(habits.isPrivate, false)))
    .orderBy(desc(habitLogs.completedAt))
    .limit(limit);

  return logs;
}

// ─── Friendships ──────────────────────────────────────────────────────────────

export async function sendFriendRequest(userId: number, friendId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // onDuplicateKeyUpdate makes the insert idempotent against races: if the
  // unique (userId, friendId) index catches a concurrent duplicate send,
  // we silently no-op instead of surfacing ER_DUP_ENTRY.
  await db
    .insert(friendships)
    .values({ userId, friendId, status: "pending" })
    .onDuplicateKeyUpdate({ set: { userId: sql`userId` } });
}

export async function acceptFriendRequest(id: number, friendId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(friendships).set({ status: "accepted" }).where(and(eq(friendships.id, id), eq(friendships.friendId, friendId)));
}

export async function getFriendshipById(id: number): Promise<Friendship | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(friendships).where(eq(friendships.id, id)).limit(1);
  return rows[0];
}

export async function getFriends(userId: number): Promise<Friendship[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(
    and(or(eq(friendships.userId, userId), eq(friendships.friendId, userId)), eq(friendships.status, "accepted"))
  );
}

export async function getPendingRequests(userId: number): Promise<Friendship[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(friendships).where(and(eq(friendships.friendId, userId), eq(friendships.status, "pending")));
}

export async function getFriendshipStatus(userId: number, otherUserId: number): Promise<Friendship | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(friendships).where(
    or(
      and(eq(friendships.userId, userId), eq(friendships.friendId, otherUserId)),
      and(eq(friendships.userId, otherUserId), eq(friendships.friendId, userId))
    )
  ).limit(1);
  return result[0];
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(data: InsertReaction): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(reactions).where(
    and(eq(reactions.logId, data.logId), eq(reactions.userId, data.userId), eq(reactions.emoji, data.emoji))
  ).limit(1);
  if (existing.length > 0) {
    await db.delete(reactions).where(eq(reactions.id, existing[0].id));
    return false; // removed
  } else {
    await db.insert(reactions).values(data);
    return true; // added
  }
}

export async function getReactionsForLogs(logIds: number[]): Promise<Reaction[]> {
  const db = await getDb();
  if (!db || logIds.length === 0) return [];
  return db.select().from(reactions).where(inArray(reactions.logId, logIds));
}

// ─── Streaks ─────────────────────────────────────────────────────────────────

/**
 * Calculate the current streak for a habit, respecting its frequencyType
 * and customDays (see server/streak.ts for the semantics).
 */
export async function getHabitStreak(habitId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const habitRows = await db
    .select({
      frequencyType: habits.frequencyType,
      customDays: habits.customDays,
    })
    .from(habits)
    .where(eq(habits.id, habitId))
    .limit(1);
  const rule = habitRows[0];
  if (!rule) return 0;

  const logs = await db
    .select({ completedAt: habitLogs.completedAt })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(desc(habitLogs.completedAt));
  if (logs.length === 0) return 0;

  return computeStreak(
    logs.map((l) => new Date(l.completedAt)),
    { frequencyType: rule.frequencyType, customDays: rule.customDays },
    new Date(),
  );
}

/**
 * Get streak counts for all habits of a user in one call.
 * Returns a map of habitId → streak count.
 */
export async function getUserHabitStreaks(userId: number): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) return {};

  const userHabits = await db
    .select({
      id: habits.id,
      frequencyType: habits.frequencyType,
      customDays: habits.customDays,
    })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));

  if (userHabits.length === 0) return {};

  const now = new Date();
  const streaks: Record<number, number> = {};
  await Promise.all(
    userHabits.map(async (h) => {
      const logs = await db
        .select({ completedAt: habitLogs.completedAt })
        .from(habitLogs)
        .where(eq(habitLogs.habitId, h.id))
        .orderBy(desc(habitLogs.completedAt));
      streaks[h.id] = logs.length === 0
        ? 0
        : computeStreak(
            logs.map((l) => new Date(l.completedAt)),
            { frequencyType: h.frequencyType, customDays: h.customDays },
            now,
          );
    })
  );
  return streaks;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(data: InsertComment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(comments).values(data);
  return (result as any)[0].insertId ?? 0;
}

export async function getCommentsForLog(logId: number): Promise<(Comment & { profile: UserProfile | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ comment: comments, profile: userProfiles })
    .from(comments)
    .leftJoin(userProfiles, eq(comments.userId, userProfiles.userId))
    .where(eq(comments.logId, logId))
    .orderBy(comments.createdAt);
  return rows.map((r) => ({ ...r.comment, profile: r.profile ?? null }));
}

export async function getCommentCountsForLogs(logIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || logIds.length === 0) return {};
  const rows = await db.select().from(comments).where(inArray(comments.logId, logIds));
  const counts: Record<number, number> = {};
  for (const row of rows) {
    counts[row.logId] = (counts[row.logId] ?? 0) + 1;
  }
  return counts;
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function createChallenge(data: {
  creatorId: number;
  title: string;
  description?: string;
  metric: string;
  targetValue: number;
  targetType: "boolean" | "numeric";
  startDate: string;
  endDate: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(challenges).values({
    creatorId: data.creatorId,
    title: data.title,
    description: data.description ?? null,
    metric: data.metric,
    targetValue: data.targetValue,
    targetType: data.targetType,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    isActive: true,
  });
  const challengeId = (result as any)[0].insertId as number;
  // Creator auto-joins
  await db.insert(challengeParticipants).values({
    challengeId,
    userId: data.creatorId,
    completionCount: 0,
    status: "joined",
  });
  return challengeId;
}

export async function inviteToChallenge(challengeId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Upsert: if already exists, ignore
  await db.insert(challengeParticipants).values({
    challengeId,
    userId,
    completionCount: 0,
    status: "invited",
  }).onDuplicateKeyUpdate({ set: { status: "invited" } });
}

export async function respondToChallenge(challengeId: number, userId: number, accept: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(challengeParticipants)
    .set({ status: accept ? "joined" : "declined", joinedAt: accept ? new Date() : null })
    .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
}

export async function logChallengeProgress(challengeId: number, userId: number, increment: number = 1): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(challengeParticipants)
    .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
  if (rows.length === 0) return;
  const current = rows[0].completionCount ?? 0;
  await db.update(challengeParticipants)
    .set({ completionCount: current + increment })
    .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
}

export async function getChallengesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Challenges where user is a participant (joined or invited)
  const rows = await db
    .select({ challenge: challenges, participant: challengeParticipants })
    .from(challengeParticipants)
    .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
    .where(eq(challengeParticipants.userId, userId))
    .orderBy(challenges.createdAt);
  return rows.map((r) => ({ ...r.challenge, myStatus: r.participant.status, myCount: r.participant.completionCount }));
}

export async function getChallengeLeaderboard(challengeId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ participant: challengeParticipants, profile: userProfiles })
    .from(challengeParticipants)
    .leftJoin(userProfiles, eq(challengeParticipants.userId, userProfiles.userId))
    .where(and(
      eq(challengeParticipants.challengeId, challengeId),
      eq(challengeParticipants.status, "joined")
    ))
    .orderBy(challengeParticipants.completionCount);
  return rows
    .map((r) => ({
      userId: r.participant.userId,
      completionCount: r.participant.completionCount ?? 0,
      displayName: r.profile?.displayName ?? "Unknown",
      avatarUrl: r.profile?.avatarUrl ?? null,
      username: r.profile?.username ?? null,
    }))
    .sort((a, b) => b.completionCount - a.completionCount);
}

export async function getChallengeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(challenges).where(eq(challenges.id, id));
  return rows[0] ?? null;
}

/**
 * Auto-sync: when a user completes a habit, check if any of their active joined
 * challenges have a metric that loosely matches the habit title or category.
 * If so, increment their completion count for that challenge.
 * Returns the number of challenges incremented.
 */
export async function autoSyncChallengesOnHabitComplete(
  userId: number,
  habitTitle: string,
  habitCategory: string | null
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();

  // Get all active challenges the user has joined
  const rows = await db
    .select({ challenge: challenges, participant: challengeParticipants })
    .from(challengeParticipants)
    .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
    .where(
      and(
        eq(challengeParticipants.userId, userId),
        eq(challengeParticipants.status, "joined"),
        eq(challenges.isActive, true)
      )
    );

  // Filter to active (not expired) challenges
  const active = rows.filter((r) => new Date(r.challenge.endDate) >= now);
  if (active.length === 0) return 0;

  // Fuzzy keyword match: check if habit title or category words appear in challenge metric
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  const habitWords = [
    ...normalize(habitTitle).split(" "),
    ...(habitCategory ? normalize(habitCategory).split(" ") : []),
  ].filter((w) => w.length > 2);

  let synced = 0;
  for (const row of active) {
    const metricWords = normalize(row.challenge.metric).split(" ").filter((w) => w.length > 2);
    const hasMatch = habitWords.some((hw) => metricWords.some((mw) => mw.includes(hw) || hw.includes(mw)));
    if (hasMatch) {
      const current = row.participant.completionCount ?? 0;
      await db
        .update(challengeParticipants)
        .set({ completionCount: current + 1 })
        .where(
          and(
            eq(challengeParticipants.challengeId, row.challenge.id),
            eq(challengeParticipants.userId, userId)
          )
        );
      synced++;
    }
  }
  return synced;
}

// ─── User Settings ────────────────────────────────────────────────────────────

export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return { userId, foodPhotoEnabled: false };
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (rows.length === 0) return { userId, foodPhotoEnabled: false };
  return rows[0];
}

export async function upsertUserSettings(userId: number, data: { foodPhotoEnabled?: boolean }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(userSettings).values({
    userId,
    foodPhotoEnabled: data.foodPhotoEnabled ?? false,
  }).onDuplicateKeyUpdate({
    set: {
      ...(data.foodPhotoEnabled !== undefined ? { foodPhotoEnabled: data.foodPhotoEnabled } : {}),
    },
  });
}

// ─── Food Logs ────────────────────────────────────────────────────────────────

export async function addFoodLog(data: {
  userId: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  photoUrl: string | null;
  notes: string | null;
  loggedAt: Date;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(foodLogs).values(data);
  return (result as any)[0].insertId as number;
}

export async function getFoodLogs(userId: number, date?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(foodLogs).where(eq(foodLogs.userId, userId)).$dynamic();
  if (date) {
    // Filter by date (YYYY-MM-DD) using loggedAt
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");
    const { gte, lte } = await import("drizzle-orm").then((m) => m);
    query = query.where(and(eq(foodLogs.userId, userId), gte(foodLogs.loggedAt, start), lte(foodLogs.loggedAt, end)));
  }
  return query.orderBy(foodLogs.loggedAt);
}

export async function deleteFoodLog(logId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(foodLogs).where(and(eq(foodLogs.id, logId), eq(foodLogs.userId, userId)));
}
