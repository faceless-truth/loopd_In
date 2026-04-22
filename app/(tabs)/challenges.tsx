import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const BRAND = "#7EB8F7";
const BRAND_PURPLE = "#A78BFA";

type ChallengeStatus = "invited" | "joined" | "declined";

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(endDate: string | Date | null) {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  const colors = useColors();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const hue = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `hsl(${hue}, 60%, 70%)`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: "#fff" }}>{initials}</Text>
    </View>
  );
}

function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: any;
  onPress: () => void;
}) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const respondMutation = trpc.challenges.respond.useMutation({
    onSuccess: () => utils.challenges.list.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const isInvite = challenge.myStatus === "invited";
  const isJoined = challenge.myStatus === "joined";
  const remaining = daysLeft(challenge.endDate);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        opacity: pressed ? 0.88 : 1,
        borderWidth: 1,
        borderColor: isInvite ? BRAND + "80" : colors.border,
      })}
    >
      {/* Invite banner */}
      {isInvite && (
        <View
          style={{
            backgroundColor: BRAND + "20",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            marginBottom: 10,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: BRAND }}>📨 You're invited!</Text>
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: BRAND_PURPLE + "20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22 }}>🏆</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
            {challenge.title}
          </Text>
          {challenge.description ? (
            <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={2}>
              {challenge.description}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            🎯 {challenge.metric}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <View style={{ backgroundColor: BRAND + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND }}>
                {remaining > 0 ? `${remaining}d left` : "Ended"}
              </Text>
            </View>
            {isJoined && (
              <View style={{ backgroundColor: BRAND_PURPLE + "20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND_PURPLE }}>
                  ✓ Joined · {challenge.myCount ?? 0} completions
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Accept / Decline buttons for invites */}
      {isInvite && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => respondMutation.mutate({ challengeId: challenge.id, accept: true })}
            disabled={respondMutation.isPending}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? "#6AA8E8" : BRAND,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Accept</Text>
          </Pressable>
          <Pressable
            onPress={() => respondMutation.mutate({ challengeId: challenge.id, accept: false })}
            disabled={respondMutation.isPending}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.muted, fontWeight: "600", fontSize: 14 }}>Decline</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

function LeaderboardModal({
  challengeId,
  title,
  visible,
  onClose,
}: {
  challengeId: number;
  title: string;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { data: leaderboard, isLoading } = trpc.challenges.leaderboard.useQuery(
    { challengeId },
    { enabled: visible }
  );
  const logMutation = trpc.challenges.logProgress.useMutation({
    onSuccess: () => trpc.useUtils().challenges.list.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const utils = trpc.useUtils();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 16, color: colors.muted }}>Close</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>🏆 Leaderboard</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.muted, textAlign: "center" }}>
            {title}
          </Text>

          {/* Log progress button */}
          <Pressable
            onPress={() => {
              logMutation.mutate({ challengeId, increment: 1 });
              utils.challenges.leaderboard.invalidate({ challengeId });
            }}
            disabled={logMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#6AA8E8" : BRAND,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            })}
          >
            {logMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>+ Log Completion</Text>
            )}
          </Pressable>

          {/* Leaderboard list */}
          {isLoading ? (
            <ActivityIndicator color={BRAND} style={{ marginTop: 32 }} />
          ) : leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <View
                key={entry.userId}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: index === 0 ? BRAND + "15" : colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: index === 0 ? BRAND + "40" : colors.border,
                }}
              >
                <Text style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                </Text>
                <AvatarCircle name={entry.displayName} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                    {entry.displayName}
                  </Text>
                  {entry.username && (
                    <Text style={{ fontSize: 12, color: colors.muted }}>@{entry.username}</Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: index === 0 ? BRAND : colors.foreground }}>
                    {entry.completionCount}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>completions</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
              <Text style={{ fontSize: 32 }}>🏁</Text>
              <Text style={{ fontSize: 15, color: colors.muted }}>No completions yet</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
                Be the first to log a completion!
              </Text>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

function CreateChallengeModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("");
  const [targetType, setTargetType] = useState<"boolean" | "numeric">("boolean");
  const [targetValue, setTargetValue] = useState("1");
  const [durationDays, setDurationDays] = useState("7");
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);

  const { data: friends } = trpc.friends.list.useQuery();
  const utils = trpc.useUtils();
  const createMutation = trpc.challenges.create.useMutation({
    onSuccess: () => {
      utils.challenges.list.invalidate();
      setTitle("");
      setDescription("");
      setMetric("");
      setTargetType("boolean");
      setTargetValue("1");
      setDurationDays("7");
      setSelectedFriendIds([]);
      onClose();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleCreate = () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a challenge title."); return; }
    if (!metric.trim()) { Alert.alert("Required", "Please describe what participants need to do."); return; }
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + (parseInt(durationDays, 10) || 7));
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      metric: metric.trim(),
      targetType,
      targetValue: parseInt(targetValue, 10) || 1,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      inviteUserIds: selectedFriendIds,
    });
  };

  const toggleFriend = (userId: number) => {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 16, color: colors.muted }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>New Challenge</Text>
          <Pressable onPress={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <ActivityIndicator color={BRAND} size="small" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND }}>Create</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>CHALLENGE TITLE *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 30-Day Step Challenge"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Description */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>DESCRIPTION (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this challenge about?"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Metric */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>WHAT TO DO *</Text>
            <TextInput
              value={metric}
              onChangeText={setMetric}
              placeholder="e.g. Walk 10,000 steps per day"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 15,
                color: colors.foreground,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              returnKeyType="done"
            />
          </View>

          {/* Duration */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>DURATION (DAYS)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["7", "14", "21", "30"].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDurationDays(d)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: durationDays === d ? BRAND : colors.surface,
                    borderWidth: 1,
                    borderColor: durationDays === d ? BRAND : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: durationDays === d ? "#fff" : colors.muted }}>
                    {d}d
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Invite friends */}
          {friends && friends.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
                INVITE FRIENDS ({selectedFriendIds.length} selected)
              </Text>
              {friends.map((f) => {
                if (!f) return null;
                const isSelected = selectedFriendIds.includes(f.userId);
                return (
                  <Pressable
                    key={f.userId}
                    onPress={() => toggleFriend(f.userId)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? BRAND + "15" : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? BRAND : colors.border,
                    }}
                  >
                    <AvatarCircle name={f.displayName} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                        {f.displayName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>@{f.username}</Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: isSelected ? BRAND : "transparent",
                        borderWidth: 2,
                        borderColor: isSelected ? BRAND : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

export default function ChallengesScreen() {
  const colors = useColors();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<{ id: number; title: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: challenges, isLoading, refetch } = trpc.challenges.list.useQuery();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const invites = challenges?.filter((c) => c.myStatus === "invited") ?? [];
  const joined = challenges?.filter((c) => c.myStatus === "joined") ?? [];

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>Challenges</Text>
        <Pressable
          onPress={() => setShowCreate(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#6AA8E8" : BRAND,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 7,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>+ New</Text>
        </Pressable>
      </View>

      <FlatList
        data={[...invites, ...joined]}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND} />
        }
        ListHeaderComponent={
          invites.length > 0 ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND, marginBottom: 8 }}>
                📨 PENDING INVITES ({invites.length})
              </Text>
            </View>
          ) : joined.length > 0 ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 }}>
                YOUR CHALLENGES
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const showJoinedHeader = invites.length > 0 && index === invites.length;
          return (
            <View style={{ paddingHorizontal: 20 }}>
              {showJoinedHeader && (
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8, marginTop: 8 }}>
                  YOUR CHALLENGES
                </Text>
              )}
              <ChallengeCard
                challenge={item}
                onPress={() => {
                  if (item.myStatus === "joined") {
                    setSelectedChallenge({ id: item.id, title: item.title });
                  }
                }}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 }}>
              <Text style={{ fontSize: 48 }}>🏆</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
                No challenges yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
                Create a challenge and invite your friends to compete together.
              </Text>
              <Pressable
                onPress={() => setShowCreate(true)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#6AA8E8" : BRAND,
                  borderRadius: 14,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginTop: 8,
                })}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Create a Challenge</Text>
              </Pressable>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <CreateChallengeModal visible={showCreate} onClose={() => setShowCreate(false)} />

      {selectedChallenge && (
        <LeaderboardModal
          challengeId={selectedChallenge.id}
          title={selectedChallenge.title}
          visible={true}
          onClose={() => setSelectedChallenge(null)}
        />
      )}
    </ScreenContainer>
  );
}
