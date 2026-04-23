import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type Tab = "friends" | "search" | "requests";

function AvatarCircle({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.charAt(0).toUpperCase();
  const colors = ["#FF5C00", "#8B5CF6", "#3B82F6", "#22C55E", "#F59E0B"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + "30",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: color + "50",
      }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: "700", color }}>
        {initials}
      </Text>
    </View>
  );
}

export default function FriendsScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: friends, refetch: refetchFriends } = trpc.friends.list.useQuery();
  const { data: pending, refetch: refetchPending } = trpc.friends.pending.useQuery();
  const { data: searchResults } = trpc.profile.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  const utils = trpc.useUtils();

  const sendRequestMutation = trpc.friends.sendRequest.useMutation({
    onSuccess: () => {
      utils.friends.list.invalidate();
      utils.friends.pending.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const acceptRequestMutation = trpc.friends.acceptRequest.useMutation({
    onSuccess: () => {
      utils.friends.list.invalidate();
      utils.friends.pending.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const declineRequestMutation = trpc.friends.decline.useMutation({
    onSuccess: () => {
      utils.friends.list.invalidate();
      utils.friends.pending.invalidate();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFriends(), refetchPending()]);
    setRefreshing(false);
  }, [refetchFriends, refetchPending]);

  const pendingCount = pending?.length ?? 0;

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "friends", label: "Friends" },
    { key: "search", label: "Find" },
    { key: "requests", label: "Requests", badge: pendingCount },
  ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
          Friends
        </Text>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 0 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? "#FF5C00" : "transparent",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#FF5C00" : colors.muted,
                  }}
                >
                  {tab.label}
                </Text>
                {tab.badge != null && tab.badge > 0 && (
                  <View
                    style={{
                      backgroundColor: "#FF5C00",
                      borderRadius: 8,
                      minWidth: 16,
                      height: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                      {tab.badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {activeTab === "friends" && (
        <FlatList
          data={friends ?? []}
          keyExtractor={(item) => item!.userId.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF5C00"
            />
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <AvatarCircle name={item!.displayName} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                  {item!.displayName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  @{item!.username}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#22C55E" + "20",
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#22C55E" }}>
                  Friends
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 40 }}>👥</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
                No friends yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
                Search for friends to start sharing your habit progress.
              </Text>
              <Pressable
                onPress={() => setActiveTab("search")}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "#E05200" : "#FF5C00",
                  borderRadius: 14,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                })}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                  Find Friends
                </Text>
              </Pressable>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {activeTab === "search" && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or username..."
                placeholderTextColor={colors.muted}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.foreground,
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Text style={{ fontSize: 16, color: colors.muted }}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          <FlatList
            data={searchResults ?? []}
            keyExtractor={(item) => item.userId.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.border,
                }}
              >
                <AvatarCircle name={item.displayName} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                    {item.displayName}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    @{item.username}
                  </Text>
                </View>
                <Pressable
                  onPress={() => sendRequestMutation.mutate({ friendId: item.userId })}
                  disabled={sendRequestMutation.isPending}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#E05200" : "#FF5C00",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  })}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                    Add
                  </Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              searchQuery.length >= 2 ? (
                <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                  <Text style={{ fontSize: 32 }}>🔍</Text>
                  <Text style={{ fontSize: 15, color: colors.muted }}>No users found</Text>
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                  <Text style={{ fontSize: 32 }}>👋</Text>
                  <Text style={{ fontSize: 15, color: colors.muted }}>
                    Type at least 2 characters to search
                  </Text>
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      )}

      {activeTab === "requests" && (
        <FlatList
          data={pending ?? []}
          keyExtractor={(item) => item!.userId.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF5C00"
            />
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <AvatarCircle name={item!.displayName} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                  {item!.displayName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  @{item!.username}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => declineRequestMutation.mutate({ requestId: (item as any).requestId })}
                  disabled={declineRequestMutation.isPending || acceptRequestMutation.isPending}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.border : "transparent",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
                    Decline
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => acceptRequestMutation.mutate({ requestId: (item as any).requestId, requesterId: (item as any).userId })}
                  disabled={acceptRequestMutation.isPending || declineRequestMutation.isPending}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "#E05200" : "#FF5C00",
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  })}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                    Accept
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>📬</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
                No pending requests
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted }}>
                You're all caught up!
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </ScreenContainer>
  );
}
