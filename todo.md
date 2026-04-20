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
