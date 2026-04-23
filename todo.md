# Accountable — Project TODO

## Branding & Setup
- [x] Generate app logo/icon
- [x] Configure theme colors (orange brand #FF5C00)
- [x] Update app.config.ts with app name and logo

## Database & Backend
- [x] Define DB schema: habits, habit_logs, friendships, reactions, comments, user_profiles
- [x] Run DB migration (pnpm db:push)
- [x] Add tRPC routes: habits CRUD
- [x] Add tRPC routes: habit_logs (complete habit, with photo)
- [x] Add tRPC routes: social feed (friends' logs)
- [x] Add tRPC routes: friendships (send, accept, list)
- [x] Add tRPC routes: reactions (add/remove)
- [x] Add tRPC routes: comments (add, list)
- [x] Add tRPC routes: user profile (setup, update)

## Authentication & Onboarding
- [x] Login screen with Manus OAuth
- [x] Profile setup screen (display name, username)
- [x] Auth guard (redirect unauthenticated users to login)

## Dashboard (Home Tab)
- [x] Tab bar with 4 tabs: Today, Feed, Friends, Profile
- [x] Dashboard screen with today's habits list
- [x] Habit card component (name, category, check button, progress)
- [x] FAB (+) to create new habit
- [x] Empty state for no habits

## Create Habit
- [x] Create Habit modal/screen
- [x] Habit name input
- [x] Category picker (Fitness, Mindfulness, Learning, Health, Productivity, Other)
- [x] Frequency selector (Daily / Weekly)
- [x] Target type toggle (Boolean / Numeric)
- [x] Privacy toggle (Public / Private)
- [x] Save habit to DB

## Habit Tracking
- [x] Check off boolean habit (tap to complete)
- [x] Write habit_log entry on completion
- [x] Habit detail screen (history, stats, delete)

## Social Feed
- [x] Feed tab screen with FlatList
- [x] Feed card component (avatar, name, habit, time, photo)
- [x] Emoji reactions row (🔥❤️💪👏✨)
- [x] Comment count + tap to view comments
- [x] Feed item detail screen with comments
- [x] Comment input and submit
- [x] Pull-to-refresh

## Friends
- [x] Friends tab screen
- [x] Search users by username or display name
- [x] Send friend request
- [x] Accept friend request
- [x] Friends list display
- [x] Pending requests badge on tab bar

## Profile
- [x] Profile tab screen (avatar, name, stats)
- [x] My habits list on profile
- [x] Edit avatar (photo picker)
- [x] Sign out

## Photo Upload
- [x] expo-image-picker integration
- [x] Avatar photo upload

## Polish
- [x] Dark mode support across all screens (ThemeProvider)
- [x] Loading states (ActivityIndicator)
- [x] Empty states for feed, friends, habits
- [x] Haptic feedback on key actions
- [x] TypeScript: 0 errors

## Future / Backlog
- [ ] Wearable integration (Apple HealthKit / Google Health Connect)
- [ ] Push notifications for friend activity
- [ ] Photo proof upload on habit completion (post-completion bottom sheet)
- [ ] Streak calculation and display
- [ ] Weekly habit frequency tracking
- [ ] Leaderboard / challenge system
- [ ] Settings screen (dark mode toggle)

## New Features (Round 2)

### Photo Proof on Completion
- [x] Photo proof bottom sheet component (camera / gallery / skip options)
- [x] Trigger bottom sheet after marking habit as complete on dashboard
- [x] Upload selected photo to server storage (base64 → tRPC logs.uploadPhoto)
- [x] Display photo thumbnail in feed cards and habit detail screen

### Streak Counters
- [x] Add streak calculation helper in server/db.ts (consecutive days with a log)
- [x] Add tRPC route: habits.streaks (returns streak count per habit for current user)
- [x] Display streak badge (🔥 N) on habit cards in dashboard
- [x] Display streak on habit detail screen
- [x] Display total active streaks count on profile screen

### Push Notifications
- [x] Read Expo notifications DOCS.md
- [x] Register push token on app launch (expo-notifications)
- [x] Save push token to user profile in DB (add pushToken column)
- [x] Add server helper: sendPushNotification(userId, title, body)
- [x] Trigger notification when friend reacts to your habit log
- [x] Trigger notification when friend comments on your habit log
- [x] Trigger notification when someone sends you a friend request
- [x] Handle notification tap → navigate to relevant screen

## Round 3 — Brooke's Notes (Loopd In Rebrand + New Features)

### Rebrand
- [x] Rename app to "Loopd In"
- [x] Generate new logo: minimalistic, pastel blue and purple
- [x] Update theme colors to pastel blue/purple palette
- [x] Update app.config.ts app name

### Habit Enhancements
- [x] Add time-of-day field to habits (Any Time / Morning / Afternoon / Nighttime / Custom time)
- [x] Sort habits on dashboard by scheduled time of day
- [x] Add sub-goal steps to numeric habits (e.g. 1L → 2L → 3L water ticks)
- [x] Display sub-goal progress on habit card (e.g. 2/3 steps completed)
- [x] Allow numeric value entry on habit completion (manual step count entry)

### Habit Analytics
- [x] Monthly/weekly breakdown view on habit detail screen
- [x] Average calculation for numeric habits (e.g. average daily steps)
- [x] Visual calendar/grid showing completion history

### Challenges
- [x] Challenges tab or section in app
- [x] Create challenge screen (name, goal metric, start/end date, invite friends)
- [x] Challenge DB schema (challenges, challenge_participants tables)
- [x] Invite friends to a challenge
- [x] Challenge leaderboard (ranked by completion count)
- [ ] Challenge habit auto-populates in participants' personal habits (backlog)

### Food Photo Feature (Opt-in)
- [x] Settings screen with Food Photo toggle (opt-in/opt-out)
- [x] Food log screen (breakfast, lunch, dinner, snacks sections)
- [x] Take/upload photo for each meal
- [ ] AI-powered food breakdown (send photo to LLM, display macros/summary) (backlog)
- [x] Food log accessible from profile or separate tab

## Round 4 — Auto-sync & Onboarding

### Challenge Auto-Sync
- [x] Add DB helper: getActiveJoinedChallengesForUser(userId) — returns challenges the user has joined
- [x] On habit completion (logs.complete), fetch user's active challenges
- [x] Match completed habit's title/category/metric to challenge metric (fuzzy or keyword match)
- [x] Auto-increment challenge completion count when a match is found
- [x] Invalidate challenges.list on client after habit completion

### Onboarding Walkthrough
- [x] Create onboarding screen with 3-step carousel (Create Habit, Invite Friends, Start Challenge)
- [x] Store "onboarding seen" flag in AsyncStorage
- [x] Show walkthrough only on first login (before dashboard)
- [x] Skip button and "Get Started" CTA on final step
- [x] Wire into auth redirect flow

## Phase 1 — Critical Fixes & Verification

- [ ] Pull fix/phase-1-criticals branch from GitHub
- [ ] Fix: numeric sub-goal multi-tap (double-completion bug)
- [ ] Fix: challenge invite modal (broken/missing)
- [ ] Fix: feed photos on iOS/Android (not just web)
- [ ] Fix: custom-days habit creation
- [ ] Fix NF-3: stub or delete app/profile/[userId].tsx (orphan Stack.Screen)
- [ ] Open PR fix/phase-1-criticals → main and merge
- [ ] Run dedupe queries and report results

## Auth Fix — Apple/Google OAuth Access Denied

- [ ] Diagnose "access denied" error on Apple/Google login
- [ ] Fix OAuth provider configuration (Apple + Google)
- [ ] Verify login works end-to-end for both providers

## OAuth Native Fix — "Permission denied: Redirect URI is not set"

- [x] Diagnose root cause: portal rejects sandbox URL as redirectUri (not registered)
- [x] Add EXPO_PUBLIC_DEPLOYED_API_URL = https://habittrack-eewwypnn.manus.space
- [x] Update constants/oauth.ts: native uses deployed domain as redirectUri
- [x] Embed app deep link in redirectUri as query param (portal forwards it back)
- [x] state = base64(full redirectUri incl. appDeepLink) for SDK token exchange
- [x] Update server /api/oauth/mobile to read appDeepLink from callback URL
- [x] Write vitest: OAuth flow logic validates deployed domain + deep link embedding
- [x] Write vitest: deployed API URL is accessible and serves /api/oauth/mobile
