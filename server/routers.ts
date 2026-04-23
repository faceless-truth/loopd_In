import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { sendPushNotification } from "./push";

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

    registerPushToken: protectedProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await db.savePushToken(ctx.user.id, input.token);
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
        subGoalSteps: z.number().int().min(1).default(1),
        isPrivate: z.boolean().default(false),
        timeOfDay: z.enum(["any_time", "morning", "afternoon", "nighttime", "custom"]).default("any_time"),
        customTime: z.string().max(5).optional(),
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

    streaks: protectedProcedure
      .query(({ ctx }) => db.getUserHabitStreaks(ctx.user.id)),
  }),

  logs: router({
    todayLogs: protectedProcedure.query(({ ctx }) => db.getTodayLogs(ctx.user.id)),

    complete: protectedProcedure
      .input(z.object({
        habitId: z.number(),
        value: z.number().int().min(1).default(1),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const logId = await db.logHabitCompletion({ ...input, userId: ctx.user.id });
        // Auto-sync: increment challenge completion count if habit matches a challenge metric
        const habit = await db.getHabitById(input.habitId);
        if (habit) {
          await db.autoSyncChallengesOnHabitComplete(
            ctx.user.id,
            habit.title,
            habit.category ?? null
          ).catch(() => { /* non-fatal */ });
        }
        return { logId };
      }),

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
      .input(z.object({ logId: z.number(), emoji: z.string().max(8), logOwnerId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const added = await db.toggleReaction({ logId: input.logId, userId: ctx.user.id, emoji: input.emoji });
        // Notify the log owner when someone reacts (not self-reactions)
        if (added && input.logOwnerId && input.logOwnerId !== ctx.user.id) {
          const [reactorProfile, ownerToken] = await Promise.all([
            db.getUserProfile(ctx.user.id),
            db.getPushToken(input.logOwnerId),
          ]);
          if (reactorProfile && ownerToken) {
            await sendPushNotification(
              ownerToken,
              `${reactorProfile.displayName} reacted ${input.emoji}`,
              "Tap to see your habit post",
              { url: `/feed/${input.logId}` }
            );
          }
        }
        return added;
      }),
  }),

  comments: router({
    list: protectedProcedure
      .input(z.object({ logId: z.number() }))
      .query(({ input }) => db.getCommentsForLog(input.logId)),

    add: protectedProcedure
      .input(z.object({ logId: z.number(), content: z.string().min(1).max(500), logOwnerId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const commentId = await db.addComment({ logId: input.logId, userId: ctx.user.id, content: input.content });
        // Notify the log owner when someone comments (not self-comments)
        if (input.logOwnerId && input.logOwnerId !== ctx.user.id) {
          const [commenterProfile, ownerToken] = await Promise.all([
            db.getUserProfile(ctx.user.id),
            db.getPushToken(input.logOwnerId),
          ]);
          if (commenterProfile && ownerToken) {
            const preview = input.content.length > 60 ? input.content.slice(0, 57) + "..." : input.content;
            await sendPushNotification(
              ownerToken,
              `${commenterProfile.displayName} commented`,
              preview,
              { url: `/feed/${input.logId}` }
            );
          }
        }
        return commentId;
      }),
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
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.friendId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot add yourself as a friend.",
          });
        }

        const existing = await db.getFriendshipStatus(ctx.user.id, input.friendId);
        if (existing) {
          if (existing.status === "accepted") {
            return { status: "already_friends" as const };
          }
          // status === "pending"
          if (existing.userId === input.friendId) {
            // The other user had already sent a pending request to us; treat
            // this send as an acceptance of theirs rather than a new row.
            await db.acceptFriendRequest(existing.id, ctx.user.id);
            const [acceptorProfile, requesterToken] = await Promise.all([
              db.getUserProfile(ctx.user.id),
              db.getPushToken(existing.userId),
            ]);
            if (acceptorProfile && requesterToken) {
              await sendPushNotification(
                requesterToken,
                "Friend request accepted! 🎉",
                `${acceptorProfile.displayName} accepted your friend request`,
                { url: "/(tabs)/friends" }
              );
            }
            return { status: "auto_accepted" as const, friendshipId: existing.id };
          }
          // existing.userId === ctx.user.id: we already sent them a pending request.
          return { status: "already_pending" as const };
        }

        await db.sendFriendRequest(ctx.user.id, input.friendId);
        // Notify the recipient of the friend request
        const [senderProfile, recipientToken] = await Promise.all([
          db.getUserProfile(ctx.user.id),
          db.getPushToken(input.friendId),
        ]);
        if (senderProfile && recipientToken) {
          await sendPushNotification(
            recipientToken,
            "New friend request",
            `${senderProfile.displayName} (@${senderProfile.username}) wants to be your friend`,
            { url: "/(tabs)/friends" }
          );
        }
        return { status: "sent" as const };
      }),

    acceptRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), requesterId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const row = await db.getFriendshipById(input.requestId);
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Friend request not found.",
          });
        }
        if (row.friendId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the recipient can accept this request.",
          });
        }
        if (row.userId === row.friendId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Malformed self-referencing friendship.",
          });
        }

        await db.acceptFriendRequest(input.requestId, ctx.user.id);
        // Notify the original requester that their request was accepted
        if (input.requesterId && input.requesterId !== ctx.user.id) {
          const [acceptorProfile, requesterToken] = await Promise.all([
            db.getUserProfile(ctx.user.id),
            db.getPushToken(input.requesterId),
          ]);
          if (acceptorProfile && requesterToken) {
            await sendPushNotification(
              requesterToken,
              "Friend request accepted! 🎉",
              `${acceptorProfile.displayName} accepted your friend request`,
              { url: "/(tabs)/friends" }
            );
          }
        }
      }),

    decline: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const row = await db.getFriendshipById(input.requestId);
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Friend request not found.",
          });
        }
        if (row.friendId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the recipient can decline this request.",
          });
        }
        await db.declineFriendRequest(input.requestId, ctx.user.id);
        // Declining is private — no push to the original requester.
      }),

    status: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .query(({ ctx, input }) => db.getFriendshipStatus(ctx.user.id, input.otherUserId)),
  }),

  challenges: router({
    list: protectedProcedure.query(({ ctx }) => db.getChallengesForUser(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(128),
        description: z.string().max(500).optional(),
        metric: z.string().min(1).max(128),
        targetValue: z.number().int().min(1).default(1),
        targetType: z.enum(["boolean", "numeric"]).default("boolean"),
        startDate: z.string(),
        endDate: z.string(),
        inviteUserIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const challengeId = await db.createChallenge({
          creatorId: ctx.user.id,
          title: input.title,
          description: input.description,
          metric: input.metric,
          targetValue: input.targetValue,
          targetType: input.targetType,
          startDate: input.startDate,
          endDate: input.endDate,
        });
        // Invite friends
        if (input.inviteUserIds && input.inviteUserIds.length > 0) {
          await Promise.all(
            input.inviteUserIds.map(async (userId) => {
              await db.inviteToChallenge(challengeId, userId);
              const [token, creatorProfile] = await Promise.all([
                db.getPushToken(userId),
                db.getUserProfile(ctx.user.id),
              ]);
              if (token && creatorProfile) {
                await sendPushNotification(
                  token,
                  "Challenge invite! 🏆",
                  `${creatorProfile.displayName} invited you to: ${input.title}`,
                  { url: "/(tabs)/challenges" }
                );
              }
            })
          );
        }
        return { challengeId };
      }),

    respond: protectedProcedure
      .input(z.object({ challengeId: z.number(), accept: z.boolean() }))
      .mutation(({ ctx, input }) => db.respondToChallenge(input.challengeId, ctx.user.id, input.accept)),

    logProgress: protectedProcedure
      .input(z.object({ challengeId: z.number(), increment: z.number().int().min(1).default(1) }))
      .mutation(({ ctx, input }) => db.logChallengeProgress(input.challengeId, ctx.user.id, input.increment)),

    leaderboard: protectedProcedure
      .input(z.object({ challengeId: z.number() }))
      .query(({ input }) => db.getChallengeLeaderboard(input.challengeId)),

    get: protectedProcedure
      .input(z.object({ challengeId: z.number() }))
      .query(({ input }) => db.getChallengeById(input.challengeId)),
  }),

  settings: router({
    get: protectedProcedure.query(({ ctx }) => db.getUserSettings(ctx.user.id)),

    update: protectedProcedure
      .input(z.object({ foodPhotoEnabled: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),

  foodLogs: router({
    list: protectedProcedure
      .input(z.object({ date: z.string().optional() }))
      .query(({ ctx, input }) => db.getFoodLogs(ctx.user.id, input.date)),

    add: protectedProcedure
      .input(z.object({
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        photoBase64: z.string().optional(),
        mimeType: z.string().optional(),
        notes: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let photoUrl: string | undefined;
        if (input.photoBase64 && input.mimeType) {
          const buf = Buffer.from(input.photoBase64, "base64");
          const stored = await storagePut(`food/${ctx.user.id}/${Date.now()}`, buf, input.mimeType);
          photoUrl = stored.url;
        }
        const logId = await db.addFoodLog({
          userId: ctx.user.id,
          mealType: input.mealType,
          photoUrl: photoUrl ?? null,
          notes: input.notes ?? null,
          loggedAt: new Date(),
        });
        return { logId, photoUrl };
      }),

    delete: protectedProcedure
      .input(z.object({ logId: z.number() }))
      .mutation(({ ctx, input }) => db.deleteFoodLog(input.logId, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
