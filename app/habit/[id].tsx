import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CATEGORY_COLORS, CATEGORY_ICONS, HabitCategory } from "@/shared/types";

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = parseInt(id, 10);
  const colors = useColors();
  const router = useRouter();

  const { data: habits, isLoading } = trpc.habits.list.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.logs.getForHabit.useQuery({ habitId, limit: 30 });
  const { data: todayLogs, refetch: refetchToday } = trpc.logs.todayLogs.useQuery();

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

  if (isLoading || !habit) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color="#FF5C00" size="large" />
      </ScreenContainer>
    );
  }

  const streak = logs?.length ?? 0;

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
        <Pressable
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
        >
          <Text style={{ fontSize: 16, color: "#FF5C00" }}>← Back</Text>
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.foreground }}
          numberOfLines={1}
        >
          {habit.title}
        </Text>
        <Pressable onPress={handleDelete}>
          <Text style={{ fontSize: 14, color: colors.error ?? "#EF4444" }}>Delete</Text>
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
                  </Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 24, fontWeight: "700", color: "#FF5C00" }}>
                    {streak}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>Total logs</Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 24, fontWeight: "700", color: "#FF5C00" }}>
                    {habit.targetValue}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {habit.targetType === "boolean" ? "Daily goal" : "Target count"}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{habit.isPrivate ? "🔒" : "🌍"}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {habit.isPrivate ? "Private" : "Public"}
                  </Text>
                </View>
              </View>

              {/* Complete today button */}
              <Pressable
                onPress={handleComplete}
                disabled={isCompletedToday || completeMutation.isPending}
                style={({ pressed }) => ({
                  backgroundColor: isCompletedToday
                    ? categoryColor + "30"
                    : pressed
                    ? "#E05200"
                    : "#FF5C00",
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

            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
              History
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
                backgroundColor: "#FF5C00" + "20",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16 }}>✓</Text>
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
