import { and, desc, eq, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
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
  comments,
  friendships,
  habitLogs,
  habits,
  reactions,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
  await db.insert(friendships).values({ userId, friendId, status: "pending" });
}

export async function acceptFriendRequest(id: number, friendId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(friendships).set({ status: "accepted" }).where(and(eq(friendships.id, id), eq(friendships.friendId, friendId)));
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
 * Calculate the current streak for a habit: consecutive days ending today (or yesterday)
 * where at least one log exists.
 */
export async function getHabitStreak(habitId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const logs = await db
    .select({ completedAt: habitLogs.completedAt })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(desc(habitLogs.completedAt));

  if (logs.length === 0) return 0;

  // Build a set of unique date strings (YYYY-MM-DD)
  const logDates = new Set(
    logs.map((l) => {
      const d = new Date(l.completedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Start from today; if today has no log, start from yesterday
  let streak = 0;
  const cursor = new Date(today);
  if (!logDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (!logDates.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * Get streak counts for all habits of a user in one call.
 * Returns a map of habitId → streak count.
 */
export async function getUserHabitStreaks(userId: number): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) return {};

  const userHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.isArchived, false)));

  if (userHabits.length === 0) return {};

  const streaks: Record<number, number> = {};
  await Promise.all(
    userHabits.map(async (h) => {
      streaks[h.id] = await getHabitStreak(h.id);
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
