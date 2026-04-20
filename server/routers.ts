import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profile: router({
    get: protectedProcedure.query(({ ctx }) => db.getUserProfile(ctx.user.id)),

    setup: protectedProcedure
      .input(z.object({
        username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
        displayName: z.string().min(1).max(64),
        avatarUrl: z.string().optional(),
        bio: z.string().max(160).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserProfile({
          userId: ctx.user.id,
          username: input.username.toLowerCase(),
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          bio: input.bio,
        });
        return { success: true };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(({ ctx, input }) => db.searchUserProfiles(input.query, ctx.user.id)),

    getByUsername: protectedProcedure
      .input(z.object({ username: z.string() }))
      .query(({ input }) => db.getUserProfileByUsername(input.username)),
  }),

  habits: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserHabits(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(128),
        category: z.string().max(32).optional(),
        frequencyType: z.enum(["daily", "weekly", "custom_days"]).default("daily"),
        customDays: z.string().optional(),
        targetType: z.enum(["boolean", "numeric"]).default("boolean"),
        targetValue: z.number().int().min(1).default(1),
        isPrivate: z.boolean().default(false),
      }))
      .mutation(({ ctx, input }) => db.createHabit({ ...input, userId: ctx.user.id })),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(128).optional(),
        category: z.string().max(32).optional(),
        isPrivate: z.boolean().optional(),
        targetValue: z.number().int().min(1).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateHabit(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteHabit(input.id, ctx.user.id)),
  }),

  logs: router({
    todayLogs: protectedProcedure.query(({ ctx }) => db.getTodayLogs(ctx.user.id)),

    complete: protectedProcedure
      .input(z.object({
        habitId: z.number(),
        value: z.number().int().min(1).default(1),
        notes: z.string().max(500).optional(),
      }))
      .mutation(({ ctx, input }) =>
        db.logHabitCompletion({ ...input, userId: ctx.user.id })
      ),

    getForHabit: protectedProcedure
      .input(z.object({ habitId: z.number(), limit: z.number().int().max(100).default(30) }))
      .query(({ input }) => db.getHabitLogs(input.habitId, input.limit)),

    uploadPhoto: protectedProcedure
      .input(z.object({
        logId: z.number(),
        base64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `habit-photos/${ctx.user.id}/${input.logId}-${Date.now()}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateHabitLogPhoto(input.logId, url);
        return { url };
      }),
  }),

  feed: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().max(50).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        const feedItems = await db.getFeedForUser(ctx.user.id, input?.limit ?? 30);
        if (feedItems.length === 0) return [];
        const logIds = feedItems.map((f) => f.log.id);
        const [allReactions, commentCounts] = await Promise.all([
          db.getReactionsForLogs(logIds),
          db.getCommentCountsForLogs(logIds),
        ]);
        return feedItems.map((item) => ({
          ...item,
          reactions: allReactions.filter((r) => r.logId === item.log.id),
          commentCount: commentCounts[item.log.id] ?? 0,
        }));
      }),
  }),

  reactions: router({
    toggle: protectedProcedure
      .input(z.object({ logId: z.number(), emoji: z.string().max(8) }))
      .mutation(({ ctx, input }) =>
        db.toggleReaction({ logId: input.logId, userId: ctx.user.id, emoji: input.emoji })
      ),
  }),

  comments: router({
    list: protectedProcedure
      .input(z.object({ logId: z.number() }))
      .query(({ input }) => db.getCommentsForLog(input.logId)),

    add: protectedProcedure
      .input(z.object({ logId: z.number(), content: z.string().min(1).max(500) }))
      .mutation(({ ctx, input }) =>
        db.addComment({ logId: input.logId, userId: ctx.user.id, content: input.content })
      ),
  }),

  friends: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const friendships = await db.getFriends(ctx.user.id);
      const friendIds = friendships.map((f) =>
        f.userId === ctx.user.id ? f.friendId : f.userId
      );
      const profiles = await Promise.all(friendIds.map((id) => db.getUserProfile(id)));
      return profiles.filter(Boolean);
    }),

    pending: protectedProcedure.query(async ({ ctx }) => {
      const requests = await db.getPendingRequests(ctx.user.id);
      const profiles = await Promise.all(
        requests.map(async (r) => {
          const profile = await db.getUserProfile(r.userId);
          return profile ? { ...profile, requestId: r.id } : null;
        })
      );
      return profiles.filter(Boolean);
    }),

    sendRequest: protectedProcedure
      .input(z.object({ friendId: z.number() }))
      .mutation(({ ctx, input }) => db.sendFriendRequest(ctx.user.id, input.friendId)),

    acceptRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(({ ctx, input }) => db.acceptFriendRequest(input.requestId, ctx.user.id)),

    status: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .query(({ ctx, input }) => db.getFriendshipStatus(ctx.user.id, input.otherUserId)),
  }),
});

export type AppRouter = typeof appRouter;
