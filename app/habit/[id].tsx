import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CATEGORY_COLORS, CATEGORY_ICONS, HabitCategory } from "@/shared/types";

const BRAND = "#7EB8F7";
const BRAND_PURPLE = "#A78BFA";

type ViewMode = "week" | "month";

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/** Returns array of Date objects for the last N days (today last) */
function getLastNDays(n: number): Date[] {
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = parseInt(id, 10);
  const colors = useColors();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const { data: habits, isLoading } = trpc.habits.list.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.logs.getForHabit.useQuery({ habitId, limit: 60 });
  const { data: todayLogs, refetch: refetchToday } = trpc.logs.todayLogs.useQuery();
  const { data: streaks } = trpc.habits.streaks.useQuery();

  const utils = trpc.useUtils();
  const deleteMutation = trpc.habits.delete.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      router.back();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const completeMutation = trpc.logs.complete.useMutation({
    onSuccess: () => {
      refetchLogs();
      refetchToday();
      utils.habits.list.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const habit = habits?.find((h) => h.id === habitId);
  const todayLog = todayLogs?.find((l) => l.habitId === habitId);
  const isCompletedToday = !!todayLog;

  const category = (habit?.category as HabitCategory) ?? "Other";
  const categoryColor = CATEGORY_COLORS[category] ?? "#6B7280";
  const categoryIcon = CATEGORY_ICONS[category] ?? "✨";

  const handleComplete = useCallback(async () => {
    if (isCompletedToday || !habit) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeMutation.mutate({ habitId: habit.id, value: 1 });
  }, [isCompletedToday, habit, completeMutation]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Habit",
      "Are you sure you want to delete this habit? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ id: habitId }),
        },
      ]
    );
  };

  // --- Analytics ---
  const analyticsData = useMemo(() => {
    if (!logs || !habit) return null;

    const days = viewMode === "week" ? getLastNDays(7) : getLastNDays(30);

    // Map each day to its log(s)
    const dayData = days.map((day) => {
      const dayLogs = logs.filter((l) => isSameDay(new Date(l.completedAt), day));
      const completed = dayLogs.length > 0;
      const totalValue = dayLogs.reduce((sum, l) => sum + l.value, 0);
      return { day, completed, totalValue, logs: dayLogs };
    });

    const completedDays = dayData.filter((d) => d.completed).length;
    const completionRate = Math.round((completedDays / days.length) * 100);

    // Average for numeric habits
    const numericDays = dayData.filter((d) => d.completed && habit.targetType === "numeric");
    const average = numericDays.length > 0
      ? Math.round(numericDays.reduce((sum, d) => sum + d.totalValue, 0) / numericDays.length)
      : null;

    return { dayData, completedDays, completionRate, average, totalDays: days.length };
  }, [logs, habit, viewMode]);

  if (isLoading || !habit) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={BRAND} size="large" />
      </ScreenContainer>
    );
  }

  const streak = streaks?.[habitId] ?? 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 16, color: BRAND }}>← Back</Text>
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.foreground }}
          numberOfLines={1}
        >
          {habit.title}
        </Text>
        <Pressable onPress={handleDelete}>
          <Text style={{ fontSize: 14, color: colors.error ?? "#F87171" }}>Delete</Text>
        </Pressable>
      </View>

      <FlatList
        data={logs ?? []}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View style={{ padding: 20, gap: 20 }}>
            {/* Hero card */}
            <View
              style={{
                backgroundColor: categoryColor + "15",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: categoryColor + "30",
                gap: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: categoryColor + "25",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{categoryIcon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
                    {habit.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: categoryColor, fontWeight: "600", marginTop: 2 }}>
                    {category} · {habit.frequencyType}
                    {habit.timeOfDay && habit.timeOfDay !== "any_time" && ` · ${habit.timeOfDay === "custom" && habit.customTime ? habit.customTime : habit.timeOfDay}`}
                  </Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 22 }}>🔥</Text>
                  <Text style={{ fontSize: 24, fontWeight: "700", color: BRAND_PURPLE }}>{streak}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>Streak</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 24, fontWeight: "700", color: BRAND }}>
                    {analyticsData?.completionRate ?? 0}%
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {viewMode === "week" ? "7-day rate" : "30-day rate"}
                  </Text>
                </View>
                {habit.targetType === "numeric" && analyticsData?.average !== null ? (
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 24, fontWeight: "700", color: BRAND }}>
                      {analyticsData?.average ?? 0}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>Avg / day</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 20 }}>{habit.isPrivate ? "🔒" : "🌍"}</Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>{habit.isPrivate ? "Private" : "Public"}</Text>
                  </View>
                )}
              </View>

              {/* Complete today button */}
              <Pressable
                onPress={handleComplete}
                disabled={isCompletedToday || completeMutation.isPending}
                style={({ pressed }) => ({
                  backgroundColor: isCompletedToday
                    ? categoryColor + "30"
                    : pressed
                    ? "#6AA8E8"
                    : BRAND,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: isCompletedToday ? 0.7 : 1,
                })}
              >
                {completeMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                    {isCompletedToday ? "✓ Completed Today!" : "Mark as Complete"}
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Analytics Section */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 14,
              }}
            >
              {/* View mode toggle */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                  Completion History
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  {(["week", "month"] as ViewMode[]).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setViewMode(mode)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: viewMode === mode ? BRAND : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: viewMode === mode ? "#fff" : colors.muted,
                        }}
                      >
                        {mode === "week" ? "7 Days" : "30 Days"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Calendar grid */}
              {analyticsData && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {analyticsData.dayData.map(({ day, completed, totalValue }, i) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <View key={i} style={{ alignItems: "center", gap: 4, width: viewMode === "week" ? 40 : 28 }}>
                            {viewMode === "week" && (
                              <Text style={{ fontSize: 10, color: colors.muted }}>
                                {day.toLocaleDateString("en-AU", { weekday: "short" })}
                              </Text>
                            )}
                            <View
                              style={{
                                width: viewMode === "week" ? 36 : 24,
                                height: viewMode === "week" ? 36 : 24,
                                borderRadius: 8,
                                backgroundColor: completed
                                  ? BRAND + (isToday ? "FF" : "99")
                                  : colors.border,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: isToday ? 2 : 0,
                                borderColor: BRAND,
                              }}
                            >
                              {completed && viewMode === "week" && (
                                <Text style={{ fontSize: 14, color: "#fff" }}>✓</Text>
                              )}
                            </View>
                            {viewMode === "week" && (
                              <Text style={{ fontSize: 9, color: colors.muted }}>
                                {day.getDate()}
                              </Text>
                            )}
                            {viewMode === "month" && (
                              <Text style={{ fontSize: 8, color: colors.muted }}>
                                {day.getDate()}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Summary stats */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                      <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND }}>
                        {analyticsData.completedDays}/{analyticsData.totalDays}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>Days completed</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                      <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND }}>
                        {analyticsData.completionRate}%
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>Completion rate</Text>
                    </View>
                    {habit.targetType === "numeric" && analyticsData.average !== null && (
                      <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                        <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_PURPLE }}>
                          {analyticsData.average}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>Avg value</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>

            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
              Recent History
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 8,
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: BRAND + "20",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, color: BRAND }}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                {formatDate(item.completedAt)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {formatTime(item.completedAt)}
                {habit.targetType === "numeric" && ` · ${item.value} ${category === "Fitness" ? "reps" : "times"}`}
              </Text>
            </View>
            {item.photoUrl && (
              <Text style={{ fontSize: 20 }}>📷</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
            <Text style={{ fontSize: 32 }}>📋</Text>
            <Text style={{ fontSize: 15, color: colors.muted }}>No logs yet</Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", paddingHorizontal: 32 }}>
              Complete this habit to start building your history.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </ScreenContainer>
  );
}
