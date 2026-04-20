import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { CATEGORY_COLORS, CATEGORY_ICONS, HabitCategory } from "@/shared/types";
import type { Habit, HabitLog } from "@/drizzle/schema";
import { PhotoProofSheet } from "@/components/photo-proof-sheet";

function getDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-AU", { weekday: "long", month: "long", day: "numeric" });
}

function HabitCard({
  habit,
  todayLog,
  streak,
  onComplete,
  onPress,
}: {
  habit: Habit;
  todayLog: HabitLog | undefined;
  streak: number;
  onComplete: (habit: Habit) => void;
  onPress: (habit: Habit) => void;
}) {
  const colors = useColors();
  const isCompleted = !!todayLog;
  const category = (habit.category as HabitCategory) ?? "Other";
  const categoryColor = CATEGORY_COLORS[category] ?? "#6B7280";
  const categoryIcon = CATEGORY_ICONS[category] ?? "✨";

  const numericProgress =
    habit.targetType === "numeric" && todayLog
      ? Math.min(todayLog.value / habit.targetValue, 1)
      : 0;

  return (
    <Pressable
      onPress={() => onPress(habit)}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        opacity: pressed ? 0.85 : 1,
        borderWidth: 1,
        borderColor: isCompleted ? categoryColor + "40" : colors.border,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {/* Category icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: categoryColor + "20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22 }}>{categoryIcon}</Text>
        </View>

        {/* Title and category */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: isCompleted ? colors.muted : colors.foreground,
              textDecorationLine: isCompleted && habit.targetType === "boolean" ? "line-through" : "none",
            }}
          >
            {habit.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <View
              style={{
                backgroundColor: categoryColor + "30",
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: categoryColor }}>
                {category}
              </Text>
            </View>
            {habit.isPrivate && (
              <Text style={{ fontSize: 11, color: colors.muted }}>🔒 Private</Text>
            )}
            {streak > 0 && (
              <View
                style={{
                  backgroundColor: "#FF5C0020",
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Text style={{ fontSize: 11 }}>🔥</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#FF5C00" }}>{streak}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Check button */}
        <Pressable
          onPress={() => onComplete(habit)}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isCompleted ? categoryColor : "transparent",
            borderWidth: 2,
            borderColor: isCompleted ? categoryColor : colors.border,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          {isCompleted && (
            <Text style={{ fontSize: 18, color: "#fff" }}>✓</Text>
          )}
        </Pressable>
      </View>

      {/* Numeric progress bar */}
      {habit.targetType === "numeric" && (
        <View style={{ marginTop: 10 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {todayLog?.value ?? 0} / {habit.targetValue}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {Math.round(numericProgress * 100)}%
            </Text>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: colors.border,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${numericProgress * 100}%`,
                backgroundColor: categoryColor,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function TodayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [photoProof, setPhotoProof] = useState<{ logId: number; habitTitle: string } | null>(null);

  const { data: habits, isLoading: habitsLoading, refetch: refetchHabits } = trpc.habits.list.useQuery();
  const { data: todayLogs, refetch: refetchLogs } = trpc.logs.todayLogs.useQuery();
  const { data: streaks } = trpc.habits.streaks.useQuery();
  const { data: profile } = trpc.profile.get.useQuery();

  const completeMutation = trpc.logs.complete.useMutation({
    onSuccess: (data, variables) => {
      refetchLogs();
      // Show photo proof sheet after completion
      const habit = habits?.find((h) => h.id === variables.habitId);
      if (data?.logId && habit) {
        setPhotoProof({ logId: data.logId, habitTitle: habit.title });
      }
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleComplete = useCallback(
    async (habit: Habit) => {
      const alreadyDone = todayLogs?.some((l) => l.habitId === habit.id);
      if (alreadyDone) return;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeMutation.mutate({ habitId: habit.id, value: 1 });
    },
    [todayLogs, completeMutation, habits]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchHabits(), refetchLogs()]);
    setRefreshing(false);
  }, [refetchHabits, refetchLogs]);

  const completedCount = habits?.filter((h) =>
    todayLogs?.some((l) => l.habitId === h.id)
  ).length ?? 0;
  const totalCount = habits?.length ?? 0;

  if (!profile) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color="#FF5C00" size="large" />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Loading your profile...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={habits ?? []}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF5C00"
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            {/* Greeting */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
                  {getDayGreeting()}, {profile.displayName.split(" ")[0]} 👋
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>
                  {formatDate(new Date())}
                </Text>
              </View>
            </View>

            {/* Progress summary */}
            {totalCount > 0 && (
              <View
                style={{
                  backgroundColor: "#FF5C00" + "15",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#FF5C00" + "30",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                    Today's Progress
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#FF5C00" }}>
                    {completedCount}/{totalCount}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" }}>
                  <View
                    style={{
                      height: "100%",
                      width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%",
                      backgroundColor: "#FF5C00",
                      borderRadius: 4,
                    }}
                  />
                </View>
                {completedCount === totalCount && totalCount > 0 && (
                  <Text style={{ fontSize: 13, color: "#FF5C00", marginTop: 8, fontWeight: "600" }}>
                    🎉 All habits completed today!
                  </Text>
                )}
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
                My Habits
              </Text>
              <Pressable
                onPress={() => router.push("/habit/create" as any)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#E05200" : "#FF5C00",
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                })}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>+ Add</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20 }}>
            <HabitCard
              habit={item}
              todayLog={todayLogs?.find((l) => l.habitId === item.id)}
              streak={streaks?.[item.id] ?? 0}
              onComplete={handleComplete}
              onPress={(h) => router.push(`/habit/${h.id}` as any)}
            />
          </View>
        )}
        ListEmptyComponent={
          habitsLoading ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <ActivityIndicator color="#FF5C00" />
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingTop: 40, paddingHorizontal: 32, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🌱</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
                No habits yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
                Start building your first habit and share your progress with friends.
              </Text>
              <Pressable
                onPress={() => router.push("/habit/create" as any)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#E05200" : "#FF5C00",
                  borderRadius: 14,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginTop: 8,
                })}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                  Create your first habit
                </Text>
              </Pressable>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Photo proof bottom sheet */}
      <PhotoProofSheet
        visible={photoProof !== null}
        logId={photoProof?.logId ?? null}
        habitTitle={photoProof?.habitTitle ?? ""}
        onClose={() => setPhotoProof(null)}
        onPhotoUploaded={() => refetchLogs()}
      />
    </ScreenContainer>
  );
}
