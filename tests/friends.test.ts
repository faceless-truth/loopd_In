import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Friendship } from "../drizzle/schema";
import type { TrpcContext } from "../server/_core/context";

// Mock the db and push modules before importing the router. The router's
// `import * as db from "./db"` will then read from our stubs.
vi.mock("../server/db", () => ({
  getFriendshipStatus: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  getFriendshipById: vi.fn(),
  declineFriendRequest: vi.fn(),
  getUserProfile: vi.fn(),
  getPushToken: vi.fn(),
}));

vi.mock("../server/push", () => ({
  sendPushNotification: vi.fn(),
}));

import * as db from "../server/db";
import { sendPushNotification } from "../server/push";
import { appRouter } from "../server/routers";

type AuthedUser = NonNullable<TrpcContext["user"]>;

function makeUser(id: number): AuthedUser {
  return {
    id,
    openId: `u${id}`,
    email: `u${id}@test`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function makeCtx(userId: number): TrpcContext {
  return {
    user: makeUser(userId),
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeFriendship(partial: Partial<Friendship> & Pick<Friendship, "id" | "userId" | "friendId" | "status">): Friendship {
  return {
    createdAt: new Date(),
    ...partial,
  };
}

const ALICE = 1; // requester in most fixtures
const BOB = 2;   // recipient in most fixtures

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing friendship, no profile/token (so push paths are no-ops)
  vi.mocked(db.getFriendshipStatus).mockResolvedValue(undefined);
  vi.mocked(db.getUserProfile).mockResolvedValue(undefined);
  vi.mocked(db.getPushToken).mockResolvedValue(null);
  vi.mocked(db.sendFriendRequest).mockResolvedValue();
  vi.mocked(db.acceptFriendRequest).mockResolvedValue();
});

describe("friends.sendRequest — self-friend guard (H4)", () => {
  it("throws BAD_REQUEST when friendId is the caller", async () => {
    const caller = appRouter.createCaller(makeCtx(ALICE));
    await expect(
      caller.friends.sendRequest({ friendId: ALICE }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.sendFriendRequest).not.toHaveBeenCalled();
  });
});

describe("friends.sendRequest — fresh request", () => {
  it("inserts and returns status:sent when no prior relationship exists", async () => {
    const caller = appRouter.createCaller(makeCtx(ALICE));

    const result = await caller.friends.sendRequest({ friendId: BOB });

    expect(result).toEqual({ status: "sent" });
    expect(db.sendFriendRequest).toHaveBeenCalledWith(ALICE, BOB);
    expect(db.acceptFriendRequest).not.toHaveBeenCalled();
  });
});

describe("friends.sendRequest — idempotent duplicate (H3)", () => {
  it("returns status:already_pending when caller has already sent a pending request", async () => {
    vi.mocked(db.getFriendshipStatus).mockResolvedValue(
      makeFriendship({ id: 42, userId: ALICE, friendId: BOB, status: "pending" }),
    );
    const caller = appRouter.createCaller(makeCtx(ALICE));

    const result = await caller.friends.sendRequest({ friendId: BOB });

    expect(result).toEqual({ status: "already_pending" });
    expect(db.sendFriendRequest).not.toHaveBeenCalled();
    expect(db.acceptFriendRequest).not.toHaveBeenCalled();
  });

  it("returns status:already_friends when a relationship is already accepted", async () => {
    vi.mocked(db.getFriendshipStatus).mockResolvedValue(
      makeFriendship({ id: 7, userId: ALICE, friendId: BOB, status: "accepted" }),
    );
    const caller = appRouter.createCaller(makeCtx(ALICE));

    const result = await caller.friends.sendRequest({ friendId: BOB });

    expect(result).toEqual({ status: "already_friends" });
    expect(db.sendFriendRequest).not.toHaveBeenCalled();
  });
});

describe("friends.sendRequest — symmetric auto-accept (H3)", () => {
  it("flips A→B pending to accepted when B sends B→A, notifies A", async () => {
    // A (ALICE) had previously sent a pending request to B (BOB); now B sends.
    vi.mocked(db.getFriendshipStatus).mockResolvedValue(
      makeFriendship({ id: 99, userId: ALICE, friendId: BOB, status: "pending" }),
    );
    // Provide a profile+token for the push-notification branch.
    vi.mocked(db.getUserProfile).mockResolvedValue({
      id: 10,
      userId: BOB,
      username: "bob",
      displayName: "Bob",
      avatarUrl: null,
      bio: null,
      pushToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.getPushToken).mockResolvedValue("ExponentPushToken[xyz]");

    const caller = appRouter.createCaller(makeCtx(BOB));

    const result = await caller.friends.sendRequest({ friendId: ALICE });

    expect(result).toEqual({ status: "auto_accepted", friendshipId: 99 });
    expect(db.acceptFriendRequest).toHaveBeenCalledWith(99, BOB);
    expect(db.sendFriendRequest).not.toHaveBeenCalled();
    // Push goes to the original requester (ALICE), via their token.
    expect(db.getPushToken).toHaveBeenCalledWith(ALICE);
    expect(sendPushNotification).toHaveBeenCalledWith(
      "ExponentPushToken[xyz]",
      expect.stringContaining("accepted"),
      expect.any(String),
      expect.objectContaining({ url: "/(tabs)/friends" }),
    );
  });
});

describe("friends.acceptRequest — guards (H4)", () => {
  it("throws NOT_FOUND when the row does not exist", async () => {
    vi.mocked(db.getFriendshipById).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(BOB));
    await expect(
      caller.friends.acceptRequest({ requestId: 999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.acceptFriendRequest).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when the caller is not the recipient", async () => {
    // Row is A→B but caller is C (not the recipient).
    vi.mocked(db.getFriendshipById).mockResolvedValue(
      makeFriendship({ id: 5, userId: ALICE, friendId: BOB, status: "pending" }),
    );
    const CAROL = 3;
    const caller = appRouter.createCaller(makeCtx(CAROL));
    await expect(
      caller.friends.acceptRequest({ requestId: 5 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.acceptFriendRequest).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN on a self-referencing row (defence in depth)", async () => {
    vi.mocked(db.getFriendshipById).mockResolvedValue(
      makeFriendship({ id: 8, userId: BOB, friendId: BOB, status: "pending" }),
    );
    const caller = appRouter.createCaller(makeCtx(BOB));
    await expect(
      caller.friends.acceptRequest({ requestId: 8 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.acceptFriendRequest).not.toHaveBeenCalled();
  });

  it("accepts a well-formed request and calls acceptFriendRequest", async () => {
    vi.mocked(db.getFriendshipById).mockResolvedValue(
      makeFriendship({ id: 12, userId: ALICE, friendId: BOB, status: "pending" }),
    );
    const caller = appRouter.createCaller(makeCtx(BOB));
    await caller.friends.acceptRequest({ requestId: 12 });
    expect(db.acceptFriendRequest).toHaveBeenCalledWith(12, BOB);
  });
});
