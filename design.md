# Accountable — Mobile App Interface Design

## Brand Identity
- **Primary Color:** `#FF5C00` (energetic orange — conveys motivation and action)
- **Background:** `#FFFFFF` light / `#0F0F0F` dark
- **Surface:** `#F7F7F7` light / `#1A1A1A` dark
- **Foreground:** `#111111` light / `#F5F5F5` dark
- **Muted:** `#888888` light / `#999999` dark
- **Border:** `#E8E8E8` light / `#2A2A2A` dark
- **Success:** `#22C55E` / `#4ADE80`
- **Error:** `#EF4444` / `#F87171`

## Screen List

1. **Onboarding / Welcome** — App intro, sign-in options
2. **Login Screen** — Manus OAuth login button
3. **Profile Setup Screen** — Display name, username, avatar upload
4. **Dashboard (Home Tab)** — Today's habits list, streak indicators, check-off
5. **Create Habit Screen** — Form: name, category, frequency, target type, privacy
6. **Habit Detail Screen** — History log, stats, edit/delete
7. **Social Feed Tab** — Strava-style feed of friends' completions
8. **Feed Item Detail** — Full post with reactions and comments
9. **Friends Tab** — Friend list, search users, pending requests
10. **Profile Tab** — User profile, stats, settings, logout
11. **Settings Screen** — Dark mode toggle, wearable sync, notifications
12. **Photo Capture Sheet** — Bottom sheet for camera/gallery selection

## Primary Content & Functionality

### Dashboard (Home Tab)
- Header: greeting + date
- Streak badge (current streak count)
- Today's habit cards: habit name, category icon, check button, progress bar (for numeric)
- FAB (+) to create new habit
- Habit categories shown as colored chips

### Create Habit Screen
- Text input: Habit name
- Category picker (Fitness, Mindfulness, Learning, Health, Productivity, Other)
- Frequency selector: Daily / Specific Days (day-of-week toggles)
- Target type toggle: Boolean (Yes/No) vs Numeric (with value input)
- Privacy toggle: Public / Private
- Save button

### Social Feed Tab
- Stories-style row at top (friends' recent activity avatars)
- FlatList of feed cards: avatar, name, habit, time, optional photo, reactions row, comment count
- Pull-to-refresh + real-time subscription badge ("New posts")
- Emoji reaction bar (🔥❤️💪👏✨)

### Friends Tab
- Search bar to find users by @username
- Tabs: Friends | Requests
- Friend cards with avatar, name, habit streak

### Profile Tab
- Large avatar + display name + @username
- Stats row: Total Habits | Current Streak | Friends
- My habits list (all habits)
- Settings gear icon in top-right

## Key User Flows

### First-Time User
1. Welcome screen → Tap "Get Started"
2. Login screen → Tap "Sign in with Manus"
3. OAuth completes → Profile Setup screen
4. Enter display name + username → Tap "Continue"
5. Permissions request (notifications, camera)
6. Land on Dashboard

### Daily Habit Check-Off
1. Open app → Dashboard shows today's habits
2. Tap habit card check button → Haptic feedback + completion animation
3. Optional photo prompt sheet appears
4. User takes/selects photo (or skips)
5. Habit marked complete, feed post created if public

### Create New Habit
1. Dashboard → Tap FAB (+)
2. Create Habit screen → Fill form
3. Tap Save → Habit appears on Dashboard

### Social Interaction
1. Feed Tab → Scroll feed
2. Tap emoji reaction → Instant reaction
3. Tap comment count → Feed Item Detail with comment input
4. Type comment → Send

## Navigation Structure

```
Tab Bar:
  [Home] [Feed] [Friends] [Profile]

Modals / Sheets:
  Create Habit (modal stack)
  Photo Capture (bottom sheet)
  Feed Item Detail (push)
  Friend Profile (push)
  Settings (push from Profile)
```

## Layout Principles
- One-handed reachability: primary actions in bottom 60% of screen
- Tab bar height: 56px + safe area
- Card radius: 16px
- Spacing unit: 4px (use multiples: 8, 12, 16, 20, 24)
- Font: System (SF Pro on iOS, Roboto on Android)
- Habit check button: 44px minimum tap target
