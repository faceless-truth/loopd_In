import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { CATEGORY_COLORS, CATEGORY_ICONS, FEED_EMOJIS, HabitCategory } from "@/shared/types";
import { resolveStorageUrl } from "@/lib/storage-url";

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ReactionBar({
  logId,
  logOwnerId,
  reactions,
  currentUserId,
}: {
  logId: number;
  logOwnerId: number;
  reactions: Array<{ id: number; logId: number; userId: number; emoji: string }>;
  currentUserId: number;
}) {
  const utils = trpc.useUtils();
  const toggleMutation = trpc.reactions.toggle.useMutation({
    onSuccess: () => {
      utils.feed.list.invalidate();
    },
  });

  // Group reactions by emoji
  const grouped = FEED_EMOJIS.map((emoji) => {
    const emojiReactions = reactions.filter((r) => r.emoji === emoji);
    const hasReacted = emojiReactions.some((r) => r.userId === currentUserId);
    return { emoji, count: emojiReactions.length, hasReacted };
  });

  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {grouped.map(({ emoji, count, hasReacted }) => (
        <Pressable
          key={emoji}
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleMutation.mutate({ logId, emoji, logOwnerId });
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 16,
            backgroundColor: hasReacted ? "#FF5C00" + "20" : "transparent",
            borderWidth: 1,
            borderColor: hasReacted ? "#FF5C00" + "60" : "transparent",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
          {count > 0 && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: hasReacted ? "#FF5C00" : "#9BA1A6",
              }}
            >
              {count}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function FeedCard({
  item,
  currentUserId,
  onCommentPress,
}: {
  item: any;
  currentUserId: number;
  onCommentPress: (logId: number, logOwnerId: number) => void;
}) {
  const colors = useColors();
  const category = (item.habit?.category as HabitCategory) ?? "Other";
  const categoryColor = CATEGORY_COLORS[category] ?? "#6B7280";
  const categoryIcon = CATEGORY_ICONS[category] ?? "✨";
  const profile = item.profile;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          gap: 10,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: categoryColor + "30",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: resolveStorageUrl(profile.avatarUrl) }}
              style={{ width: 40, height: 40 }}
            />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: "700", color: categoryColor }}>
              {profile?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
            {profile?.displayName ?? "Unknown"}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            @{profile?.username ?? "unknown"} · {timeAgo(item.log.completedAt)}
          </Text>
        </View>

        {/* Category badge */}
        <View
          style={{
            backgroundColor: categoryColor + "20",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: categoryColor }}>
            {categoryIcon} {category}
          </Text>
        </View>
      </View>

      {/* Habit completion */}
      <View
        style={{
          marginHorizontal: 14,
          marginBottom: 12,
          backgroundColor: categoryColor + "10",
          borderRadius: 12,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: categoryColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>✓</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
            {item.habit?.title ?? "Habit"}
          </Text>
          {item.log.notes && (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {item.log.notes}
            </Text>
          )}
        </View>
      </View>

      {/* Photo */}
      {item.log.photoUrl && (
        <Image
          source={{ uri: resolveStorageUrl(item.log.photoUrl) }}
          style={{
            width: "100%",
            height: 200,
            marginBottom: 12,
          }}
          resizeMode="cover"
        />
      )}

      {/* Reactions + Comments */}
      <View
        style={{
          paddingHorizontal: 14,
          paddingBottom: 14,
          gap: 10,
        }}
      >
        <ReactionBar
          logId={item.log.id}
          logOwnerId={item.log.userId}
          reactions={item.reactions ?? []}
          currentUserId={currentUserId}
        />

        <Pressable
          onPress={() => onCommentPress(item.log.id, item.log.userId)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 14 }}>💬</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {item.commentCount > 0
              ? `${item.commentCount} comment${item.commentCount !== 1 ? "s" : ""}`
              : "Add a comment"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: feedItems, isLoading, refetch } = trpc.feed.list.useQuery();
  const { data: profile } = trpc.profile.get.useQuery();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (!user) return null;

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          Friends' Feed
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
          See what your friends are accomplishing
        </Text>
      </View>

      <FlatList
        data={feedItems ?? []}
        keyExtractor={(item) => item.log.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF5C00"
          />
        }
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            currentUserId={user.id}
            onCommentPress={(logId, logOwnerId) => router.push({ pathname: `/feed/${logId}` as any, params: { logOwnerId: String(logOwnerId) } })}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <ActivityIndicator color="#FF5C00" size="large" />
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingTop: 60,
                paddingHorizontal: 32,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 48 }}>🌟</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.foreground,
                  textAlign: "center",
                }}
              >
                Your feed is empty
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Add friends and start tracking habits to see their progress here.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/friends" as any)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#E05200" : "#FF5C00",
                  borderRadius: 14,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginTop: 8,
                })}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                  Find Friends
                </Text>
              </Pressable>
            </View>
          )
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
      />
    </ScreenContainer>
  );
}
