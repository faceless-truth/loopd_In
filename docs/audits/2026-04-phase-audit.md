# Bug Audit — loopd-in (2026-04)

Source: end-to-end audit of the Expo + tRPC + Drizzle codebase at commit
`origin/main @ 41716f7` (2026-04). Focus: runtime bugs that block features,
not style or hypothetical improvements.

This document is the canonical reference for the phased remediation plan.
Do not edit severities or IDs after-the-fact — add an "Update:" line under
the relevant entry if status changes.

---

## 🔴 CRITICAL — feature fully broken

### C1. Numeric habits with sub-goal steps can only be logged once per day
**`app/(tabs)/index.tsx:277-281`**

```js
const alreadyDone = todayLogs?.some((l) => l.habitId === habit.id);
if (alreadyDone) return;
…completeMutation.mutate({ habitId: habit.id, value: 1 });
```

The "already logged today" guard fires after the first tap, so tap #2 and
#3 do nothing. `value: 1` is also hardcoded. The whole "3 steps of 1L
water" feature never completes. User sees 1/3 filled and can't advance.

**Fix direction:** Drop the guard for numeric habits; either (a) mutate an
"increment" endpoint that updates today's single log, or (b) sum `value`
across today's logs in the UI and let each tap create a new log of the
per-step size (`targetValue / subGoalSteps`).

### C2. Challenge "Invite friends" list never renders any friends (silent failure)
**`app/(tabs)/challenges.tsx:502-509`** vs **`server/routers.ts:213-220`**

```js
// client assumes: friends = [{ friendId, profile: {...} }]
friends.map((f: any) => {
  const profile = f.profile;
  if (!profile) return null;
  …selectedFriendIds.includes(f.friendId)…
})
// server actually returns: UserProfile[] flat — f.profile and f.friendId are undefined
```

Every row returns null; invite UI is empty. Even the title
`(0 selected)` can never increase because `f.friendId` is undefined.
Challenge invite is non-functional.

**Fix direction:** Either have `friends.list` return `{ friendId, profile }`,
or change the modal to read `f.userId`, `f.displayName`, `f.username` off the
flat profile.

### C3. Habit photos do not load on iOS/Android
**`server/storage.ts:71`, rendered at `app/(tabs)/feed.tsx:217`, `app/feed/[logId].tsx`, `app/habit/[id].tsx`**

`storagePut` returns `url: /manus-storage/${key}` (path only, no host). The
URL is stored in `habitLogs.photoUrl` and passed straight into
`<Image source={{ uri }} />`. On web, the relative URL resolves to the
current origin; on native, RN's `Image` does not auto-prepend a host, so
the fetch fails and the image never renders. Feed photos + habit detail
photos are broken on mobile.

**Fix direction:** Return an absolute URL from `storagePut` (prepend
`getApiBaseUrl()` equivalent on server), or stitch it at render time via a
helper.

### C4. Streak calculation ignores `frequencyType` and `customDays`
**`server/db.ts:290-328`**

`getHabitStreak` walks backwards day-by-day and breaks on the first day
without a log. A Mon/Wed/Fri habit logs on Wed, Fri → Thursday has no log
→ streak resets to 0 even though the user was on-target. Weekly habits
reset after a single non-logged day. This makes the streak number on the
Today card (`app/(tabs)/index.tsx:166`) unusable for any non-daily habit.

**Fix direction:** Fetch the habit's `frequencyType`/`customDays` first
and only require a log on days that are actually scheduled.

### C5. Custom-day habits ("Mon/Wed/Fri") cannot be created from the UI at all
**`app/habit/create.tsx:22-25`**

```js
const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];
```

The enum value `"custom_days"` is in the schema + tRPC input, but the UI
exposes only daily/weekly, and there's no day-of-week picker. Result: a
feature in the schema is unreachable. Combined with C4 the feature is
entirely dead.

**Fix direction:** Add the third option plus a 7-button day picker; send
`customDays` (e.g. `"1,3,5"`) on create.

---

## 🟠 HIGH — breaks in the common case

### H1. `getTodayLogs` / streaks use server-local timezone
**`server/db.ts:171-180` and `:310-322`**

```js
const today = new Date();
today.setHours(0, 0, 0, 0);   // server-local midnight
…log.completedAt >= today && log.completedAt < tomorrow
```

The server runs in UTC, phone in Sydney (AEST = UTC+10). Anything logged
between 10:00 UTC yesterday and 10:00 UTC today is "today" for the user
but will overlap the server's day boundary incorrectly. Completion
checkmarks and streak bookkeeping disagree with the user's wall clock.
Same server-local-date bug lives in `getHabitStreak`'s `todayStr` +
`cursor`.

**Fix direction:** Accept a user timezone offset (or IANA zone) from the
client and compute boundaries in that zone.

### H2. Streak stays stale after logging a habit
**`app/(tabs)/index.tsx:261-273`**

`completeMutation.onSuccess` calls `refetchLogs()` and
`utils.habits.list.invalidate()`, but never invalidates
`trpc.habits.streaks`. After completing today, the 🔥 badge keeps showing
the pre-completion number until the user navigates away and back.

**Fix direction:** Add `utils.habits.streaks.invalidate()` (and invalidate
`feed.list` for social updates).

### H3. Friend-request duplicate prevention missing — in schema AND server
**`drizzle/schema.ts:108-114`, `server/db.ts:223-227`**

```js
export const friendships = mysqlTable("friendships", { … });  // no unique index
sendFriendRequest: await db.insert(friendships).values({ userId, friendId, status: "pending" });
```

No composite unique on `(userId, friendId)` and no pre-check. Tapping
"Add" twice — or A→B pending + B→A pending — produces multiple rows.
`getFriends` will list the same friend twice after acceptance;
`acceptRequest` will only flip one row while the other sits pending.

**Fix direction:** Add a unique `(userId, friendId)` index and guard on
insert (or upsert) before notifying.

### H4. No self-friend guard
**`server/routers.ts:233-250`**

Nothing prevents `input.friendId === ctx.user.id`. `sendFriendRequest`
succeeds, the user receives a push, and the user appears in their own
friends list (which also leaks their own logs into their feed once they
"accept").

**Fix direction:** Validate `ctx.user.id !== input.friendId` at the top of
`sendRequest` (and probably in `acceptRequest` too).

### H5. No `friends.decline` endpoint at all
**`server/routers.ts:212-276`, `app/(tabs)/friends.tsx:341-377`**

Requests tab only renders an "Accept" button; there is no decline
mutation or handler. Users cannot reject an unwanted friend request — it
sits pending forever (and will push-notify them again if the sender
re-sends, see H3).

**Fix direction:** Add `friends.decline` mutation that deletes (or sets
`status="declined"`) the row.

### H6. Auto-sync fuzzy matcher produces false positives on substring overlap
**`server/db.ts:540`**

```js
mw.includes(hw) || hw.includes(mw)
```

With `length > 2` filter: "eat" (habit "eating") ⊂ "heart" (challenge
"heart health") → match. "art" ⊂ "start" / "martial" / "smart". "run" ⊂
"trunk". A single habit completion increments unrelated challenges. Also
misses stem variants like "ran" vs "run" (neither includes the other).

**Fix direction:** Tokenize and compare whole words (or apply stemming);
require ≥1 exact-word match, not substring.

### H7. Double-count: manual challenge log + auto-sync both fire
**`server/routers.ts:107-119` + `app/(tabs)/challenges.tsx:241-259` (manual "+ Log Completion" button)**

`logs.complete` calls `autoSyncChallengesOnHabitComplete`, which may
already increment the challenge. If the user also taps the leaderboard's
"+ Log" button, `logChallengeProgress` increments again for the same
activity. Leaderboards get inflated.

**Fix direction:** Pick one path: either remove auto-sync, or remove the
manual button (or make manual-only use `logChallengeProgress` and skip
auto-sync when the habit is already linked via
`challengeParticipants.habitId`).

### H8. Expo push token re-registers on every hook mount without user-change guard
**`hooks/use-push-notifications.ts:34-93`**

`useEffect(…, [])` — no dependency on `user`. When the user logs out and
logs in as User B on the same device, the hook never re-runs, so the
token remains registered against User A's profile. New user's
notifications go to no one. Also on first mount the effect registers but
never clears the old token on logout, so the previous user keeps
receiving pushes.

**Fix direction:** Mount this hook under an `AuthedApp` shell that
remounts on user change, or key the effect on `user.id` and call a
`clearPushToken` mutation on logout.

### H9. OAuth success → redirect to `/(tabs)` can bounce back to `/(auth)/login`
**`app/oauth/callback.tsx:65` and `app/_layout.tsx:44-52`**

After `Auth.setSessionToken` + `Auth.setUserInfo`, the callback calls
`router.replace("/(tabs)")`. `AuthRedirect`'s `useAuth` instance has no
subscription to AsyncStorage; `user` stays `null` until a remount/refetch.
The useEffect then fires with `!user && !inAuthGroup && !inOAuthGroup`
(segments are now `(tabs)`), redirecting to login. The 1-second
`setTimeout` is a band-aid that the race can still beat.

**Fix direction:** Call `refresh()` from `useAuth` before the redirect, or
expose a global auth store (Zustand/Jotai) so state flips synchronously
after token write. *(Partly unverifiable — see bottom.)*

### H10. `auth.logout` crashes when called via native Bearer-token path
**`server/routers.ts:15-19`**

```js
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
…
```

No guard on `ctx.res`. If the SDK's native token path delivers context
without a full Express res (or if `getSessionCookieOptions(ctx.req)`
throws when req lacks the cookie parser), the procedure throws → client
logout shows an error (though `useAuth.logout` continues anyway via
`finally`). User sees an "Error" toast on every logout.

**Fix direction:** `if (ctx.res && typeof ctx.res.clearCookie === "function") …`,
and wrap in try/catch.

### H11. Feed surfaces logs of soft-deleted habits
**`server/db.ts:209-218`**

`getFeedForUser` joins `habits` but doesn't `eq(habits.isArchived, false)`.
After a friend archives/deletes a habit, all past logs keep appearing in
the feed — and on detail tap, they open on a habit card that's hidden
from the owner's own today list.

**Fix direction:** Add `eq(habits.isArchived, false)` to the feed WHERE.

### H12. Logout doesn't clear onboarding-seen or push token
**`hooks/use-auth.ts:83-95`, `app/onboarding.tsx:22` (`loopd_in_onboarding_seen`)**

Logout removes the session token + user cache but not `ONBOARDING_SEEN_KEY`
in AsyncStorage. If User A uses the device, logs out, User B logs in on
the same phone, B skips the onboarding carousel. Minor UX but fits your
"first-run flag across reinstall/logout" checklist. (Reinstall is fine
because AsyncStorage is per-install.)

**Fix direction:** Remove `ONBOARDING_SEEN_KEY` (and any `pushToken` key)
in `useAuth.logout`.

---

## 🟡 MEDIUM — edge cases, UI goes stale, or silent data issues

### M1. `profile.getByUsername` is case-sensitive but usernames are stored lowercase
**`server/routers.ts:54-57` + `server/db.ts:90-95`**

`profile.setup` lowercases on save (routers.ts:35) but the lookup passes
input through raw. Querying `"Elio"` returns `undefined`; a deep link
like `/profile/Elio` or `@Elio` from share can't resolve.

**Fix direction:** `.toLowerCase()` in `getUserProfileByUsername` or in
the router.

### M2. `upsertUserProfile` never updates `username` on re-setup
**`server/db.ts:97-103`**

`onDuplicateKeyUpdate({ set: { displayName, avatarUrl, bio } })` —
`username` is deliberately omitted, so a user who runs setup a second
time can change name/bio but not their handle. Combined with
profile-setup being reachable only when `profileQuery.data` is falsy
(layout 62), users never hit this path — but it still means the handle
is permanent even though the UI implies it's editable.

**Fix direction:** Include `username: data.username` in the update set
(and accept it's now re-validated as unique).

### M3. `challengeParticipants` has no unique `(challengeId, userId)` → `onDuplicateKeyUpdate` is a no-op
**`drizzle/schema.ts:170-179` + `server/db.ts:422-432`**

`inviteToChallenge` uses `.onDuplicateKeyUpdate(...)`, but MySQL only
triggers that on a unique-constraint violation, and there is none.
Re-inviting a user inserts a second participant row.
`respondToChallenge` then updates *all* matching rows
(`where challengeId = … and userId = …`), and the leaderboard query can
double-count.

**Fix direction:** Add a compound unique index on `(challengeId, userId)`
and keep the upsert.

### M4. `logChallengeProgress` has a read-then-write race
**`server/db.ts:442-452`**

Two concurrent `+1` calls both read the same base, both write base+1;
user loses one count. Real at double-tap speed on iOS if network is slow.

**Fix direction:** `UPDATE … SET completionCount = completionCount + ?`
inline instead of a read/write pair.

### M5. Archive challenge / expiration not enforced
**`server/db.ts:454-465`**

`getChallengesForUser` never filters by `endDate` or `isActive`; expired
challenges stay in the list and the leaderboard's "+ Log" button still
fires. Users can keep scoring after end date.

**Fix direction:** Filter `endDate >= now` (or `isActive=true` with a job
flipping it).

### M6. `comments.add` doesn't invalidate the feed
**`app/feed/[logId].tsx:39-43`**

Only `refetch()` on the detail screen's comments list. The feed tab's
cached `feed.list` still shows the old `commentCount`.

**Fix direction:** `utils.feed.list.invalidate()` in `onSuccess`.

### M7. `reactions.toggle` only invalidates feed, not detail screen's comments query (minor) and doesn't optimistically update
**`app/(tabs)/feed.tsx:40-44`**

Emoji pills rely on a full feed refetch; there's a visible lag between
tap and state change. Not a hard bug, but UX breaks on slow networks.

### M8. `food-log` date filter mismatches UTC
**`server/db.ts:600-606`**

Server uses `new Date(date + "T00:00:00.000Z")` /
`...T23:59:59.999Z`. Client sends a local-day string; for a user in Sydney
logging breakfast at 07:00 AEST, that's 21:00 UTC prior day — the log
lands in "yesterday"'s bucket.

**Fix direction:** Have the client send the ISO date string in the user's
timezone or send min/max UTC range.

### M9. Food-log opt-in enforced only client-side
**`server/routers.ts:359-381`**

Any authenticated user can `foodLogs.add` regardless of
`userSettings.foodPhotoEnabled`. Not a crash, but the gate is cosmetic.

### M10. Unbounded `userProfiles` scan in `searchUserProfiles`
**`server/db.ts:118-127`**

Pulls up to 50 profiles (ordered by nothing) then filters in JS. Users
51+ are unreachable from search. Low now, becomes a bug at scale.

**Fix direction:** Push the `LIKE` into the SQL query; drop the 50-cap.

### M11. `habits.update` ignores most fields that are configurable at create time
**`server/routers.ts:77-88`**

Accepts only `title/category/isPrivate/targetValue`. No current UI calls
this (so no runtime crash), but your checklist lists "edit" as a
feature — it isn't wired in. Nothing in `app/habit/[id].tsx` opens an
edit form.

**Fix direction:** Expand the input schema, then build the edit form.

### M12. `AuthRedirect` gate uses `profileQuery.isLoading` which doesn't cover the initial "not yet fetched" window on some tRPC versions
**`app/_layout.tsx:62-72`**

With `enabled: !!user`, the query starts paused. On first render after
login, the enabled flag flips and the query becomes "pending" briefly;
`profileQuery.data` is `undefined` and `isLoading` can be `false` between
renders. That can flash users to `/profile/setup` before the profile
fetches, and then back.

**Fix direction:** Gate on
`profileQuery.isPending === false && profileQuery.data === undefined && !profileQuery.isError`
or use `fetchStatus === "idle"`.

### M13. `photo-proof-sheet` success doesn't invalidate feed
**`components/photo-proof-sheet.tsx:39-48`**

`onPhotoUploaded` only calls `refetchLogs()` (from Today). Feed's cached
`feed.list` still shows the log without a photo until refresh.

**Fix direction:** Invalidate `feed.list` and `logs.getForHabit` on
upload success.

### M14. `foodLogs.add` client-side cache not invalidated

Agent observation — verify in `food-log.tsx` if you rely on it.
`addFoodLog` returns `{ logId, photoUrl }` but new entry won't appear
unless the screen invalidates `foodLogs.list`. If it doesn't, the log
reappears only after app reopen.

---

## 🟢 LOW — rare / minor

### L1. `getTodayLogs` does a full-table scan
**`server/db.ts:178-179`**

Pulls every log for the user then filters in JS. Works today; rots as
data grows. `habitLogs` has no index on `userId` or `completedAt` in the
schema either.

### L2. `feed.list` returns all user's friends' logs without excluding the viewer's own logs
**`server/db.ts:206`**

`friendIds = friendRows.map(...)`, self excluded. Probably intended.
Flagging so you know.

### L3. Push tokens are never validated at registration time
**`server/routers.ts:43-48`**

The client's registered token is stored verbatim.
`sendPushNotification` filters malformed tokens silently. If a dev
build registers `"dev-…"`, no notifications ever arrive and nothing tells
you.

### L4. `crypto.randomUUID()` in storage requires Node ≥16
**`server/storage.ts:25`**

No `"engines"` in `package.json`. Won't surface on Manus's runtime
(likely Node 18+) but will on a vanilla Node 14 container.

### L5. `challenges.create` parses `startDate`/`endDate` via `new Date(string)` with no Zod validation of format
**`server/routers.ts:288-289`, `server/db.ts:407-408`**

Bad strings become `Invalid Date` and silently insert `NULL`/epoch.

### L6. `getChallengesForUser` returns declined challenges too
**`server/db.ts:454-465`**

The client filter (`challenges.tsx:567-568`) happens to drop them, but
the wire contract is leaky.

### L7. Comments sorted oldest-first
**`server/db.ts:371`** — likely fine for a thread, flagging per checklist.

### L8. `PhotoProofSheet` uses `expo-file-system/legacy` import path
**`components/photo-proof-sheet.tsx:15`**

Works today, but the legacy shim is deprecated and removed in newer Expo
SDKs. Will break at a future Expo upgrade.

### L9. `onboarding.tsx:61` calls `useRef` inside `.map()`

Passes only because `STEPS.length` is a module constant. Fragile against
future edits.

---

## Severity summary

| #     | Severity | Feature               | One-liner |
|-------|----------|-----------------------|-----------|
| C1    | Critical | Habits                | Numeric sub-goal habits lock after first tap |
| C2    | Critical | Challenges            | Invite-friends list renders nothing (shape mismatch) |
| C3    | Critical | Photo proof / feed    | Native Image can't load relative `/manus-storage/` URL |
| C4    | Critical | Streaks               | Streak ignores frequency / customDays |
| C5    | Critical | Habits                | Create UI has no way to pick custom days |
| H1    | High     | Habits / logs         | `todayLogs` + streak use server-local timezone |
| H2    | High     | Habits                | Streak cache stale after completion (no invalidate) |
| H3    | High     | Friends               | No `(userId,friendId)` unique → duplicate requests |
| H4    | High     | Friends               | No self-friend guard |
| H5    | High     | Friends               | No decline endpoint or UI button |
| H6    | High     | Challenges auto-sync  | Substring fuzzy match false positives |
| H7    | High     | Challenges            | Manual log + auto-sync double-count |
| H8    | High     | Push                  | Push token not re-bound on user switch / logout |
| H9    | High     | Auth                  | OAuth-success → (tabs) can bounce back to login |
| H10   | High     | Auth                  | `auth.logout` can throw on native bearer path |
| H11   | High     | Feed                  | Archived-habit logs still appear in feed |
| H12   | High     | Onboarding            | Logout doesn't clear onboarding-seen flag |
| M1    | Medium   | Profile               | `getByUsername` case-sensitive |
| M2    | Medium   | Profile               | Upsert never updates `username` |
| M3    | Medium   | Challenges            | Missing unique on participants → duplicate invites |
| M4    | Medium   | Challenges            | `logChallengeProgress` read-then-write race |
| M5    | Medium   | Challenges            | Expired challenges never hide |
| M6    | Medium   | Comments              | `comments.add` doesn't invalidate feed |
| M7    | Medium   | Reactions             | Full refetch for every toggle |
| M8    | Medium   | Food log              | UTC-vs-local date filter mismatch |
| M9    | Medium   | Food log              | Opt-in only enforced client-side |
| M10   | Medium   | Search                | 50-row scan+JS filter caps visibility |
| M11   | Medium   | Habits                | `habits.update` accepts only 4 fields; edit form absent |
| M12   | Medium   | Auth gate             | Profile-setup flash on login race |
| M13   | Medium   | Photo proof           | Upload success doesn't invalidate feed |
| M14   | Medium   | Food log              | Food-log cache not invalidated |
| L1-L9 | Low      | Various               | See above |

---

## Unverifiable from source

These checks depend on Manus platform-injected code under `_core/` that
can't be fully inspected from this snapshot:

1. `lib/_core/auth.ts` behavior on native vs web — no `.web.ts` variant
   exists, so a single file handles both; whether `setSessionToken` /
   `setUserInfo` emit any subscribe-able events (for H9) is not visible.
   If they don't, H9 is a real race; if they do, the 1s delay may mask
   it.
2. `server/_core/sdk.authenticateRequest` — how it resolves a user from
   Bearer vs cookie in `context.ts`. Determines whether H10's
   `auth.logout` crash is actually reachable on native.
3. `server/_core/storageProxy` — whether `/manus-storage/{key}` is served
   from the same origin as tRPC. Confirms C3's severity (if served on a
   different host, even web is broken).
4. Forge presign `v1/storage/presign/put` — whether the presigned PUT
   accepts `Content-Type: image/jpeg` and whether the retrieval path
   respects content-type from upload.
5. `server/_core/oauth.ts` / `cookies.ts` — whether
   `ctx.res.clearCookie(..., { maxAge: -1 })` is the correct invalidation
   recipe, and whether native bearer login writes any server-side session
   state that `auth.logout` needs to clear.
6. Manus runtime cookie injection (`initManusRuntime`) — how web cookies
   get set before `useAuth` fetches; determines whether M12's flash is
   visible in practice.

---

## Phase plan

- Phase 1 — Criticals (C1–C5)
- Phase 2 — Friends hardening (H3, H4, H5)
- Phase 3 — Timezone handling (H1, M8)
- Phase 4 — Challenges hardening (H6, H7, M3, M4, M5)
- Phase 5 — Cache invalidation sweep (H2, M6, M7, M13, M14)
- Phase 6 — Auth/session lifecycle (H8, H9, H10, H12) — requires reading
  `_core/` auth files first
- Phase 7 — Remaining Highs (H11)
- Phase 8 — Remaining Mediums (M1, M2, M9, M10, M11, M12, M14)
- Phase 9 — Lows (L1–L9) — review each; skip if not worth the risk
