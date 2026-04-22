import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { CATEGORY_COLORS, CATEGORY_ICONS, HabitCategory } from "@/shared/types";
import { resolveStorageUrl } from "@/lib/storage-url";

const BRAND = "#7EB8F7";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: profile, refetch: refetchProfile } = trpc.profile.get.useQuery();
  const { data: habits } = trpc.habits.list.useQuery();
  const { data: todayLogs } = trpc.logs.todayLogs.useQuery();
  const { data: streaks } = trpc.habits.streaks.useQuery();
  const { data: settings } = trpc.settings.get.useQuery();
  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.profile.setup.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProfile();
    setRefreshing(false);
  }, [refetchProfile]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploadingAvatar(true);
    try {
      // Upload via logs.uploadPhoto reuse pattern — use a direct fetch to the storage API
      const base64 = asset.base64;
      const mimeType = asset.mimeType ?? "image/jpeg";

      // We'll update the profile with the base64 as a data URI for now
      // In production this would upload to S3 via the server
      const dataUri = `data:${mimeType};base64,${base64}`;

      if (profile) {
        await updateProfileMutation.mutateAsync({
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: dataUri,
          bio: profile.bio ?? undefined,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color="#FF5C00" size="large" />
      </ScreenContainer>
    );
  }

  const completedToday = habits?.filter((h) =>
    todayLogs?.some((l) => l.habitId === h.id)
  ).length ?? 0;
  const totalHabits = habits?.length ?? 0;
  const activeStreaks = streaks
    ? Object.values(streaks).filter((s) => s > 0).length
    : 0;
  const longestStreak = streaks
    ? Math.max(0, ...Object.values(streaks))
    : 0;

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF5C00"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
            Profile
          </Text>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 14, color: colors.error ?? "#EF4444" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Profile card */}
        <View
          style={{
            margin: 20,
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Avatar */}
          <Pressable
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: "#FF5C00" + "30",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "#FF5C00",
              }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color="#FF5C00" />
              ) : profile.avatarUrl ? (
                <Image
                  source={{ uri: resolveStorageUrl(profile.avatarUrl) }}
                  style={{ width: 88, height: 88 }}
                />
              ) : (
                <Text style={{ fontSize: 36, fontWeight: "700", color: "#FF5C00" }}>
                  {profile.displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: "#FF5C00",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.surface,
              }}
            >
              <Text style={{ fontSize: 12, color: "#fff" }}>📷</Text>
            </View>
          </Pressable>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
              {profile.displayName}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted }}>
              @{profile.username}
            </Text>
            {profile.bio && (
              <Text
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {profile.bio}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              gap: 1,
              width: "100%",
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {[
              { label: "Habits", value: totalHabits },
              { label: "Today", value: `${completedToday}/${totalHabits}` },
              { label: "🔥 Best Streak", value: longestStreak },
            ].map((stat, i) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 12,
                  backgroundColor: colors.background,
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "700", color: "#FF5C00" }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 20,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: colors.muted,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            SETTINGS
          </Text>

          {/* Food Photo Toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderTopWidth: 0.5,
              borderTopColor: colors.border,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 20 }}>🍽️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Food Photo Log</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Track your meals with photos
              </Text>
            </View>
            <Pressable
              onPress={() =>
                updateSettingsMutation.mutate({ foodPhotoEnabled: !settings?.foodPhotoEnabled })
              }
              style={{
                width: 48,
                height: 28,
                borderRadius: 14,
                backgroundColor: settings?.foodPhotoEnabled ? BRAND : colors.border,
                justifyContent: "center",
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#fff",
                  alignSelf: settings?.foodPhotoEnabled ? "flex-end" : "flex-start",
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              />
            </Pressable>
          </View>

          {/* Food Log link — only shown when enabled */}
          {settings?.foodPhotoEnabled && (
            <Pressable
              onPress={() => router.push("/food-log" as any)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: 0.5,
                borderTopColor: colors.border,
                opacity: pressed ? 0.7 : 1,
                gap: 12,
              })}
            >
              <Text style={{ fontSize: 20 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>View Food Log</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>See today's meals</Text>
              </View>
              <Text style={{ fontSize: 18, color: colors.muted }}>›</Text>
            </Pressable>
          )}
        </View>

        {/* Habits breakdown */}
        {habits && habits.length > 0 && (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
              My Habits
            </Text>
            {habits.map((habit) => {
              const category = (habit.category as HabitCategory) ?? "Other";
              const categoryColor = CATEGORY_COLORS[category] ?? "#6B7280";
              const categoryIcon = CATEGORY_ICONS[category] ?? "✨";
              const isCompleted = todayLogs?.some((l) => l.habitId === habit.id);
              return (
                <Pressable
                  key={habit.id}
                  onPress={() => router.push(`/habit/${habit.id}` as any)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: categoryColor + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{categoryIcon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                      {habit.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      {category} · {habit.frequencyType}
                    </Text>
                  </View>
                  {isCompleted && (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "#FF5C00",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 16, color: colors.muted }}>›</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
