import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function FeedDetailScreen() {
  const { logId, logOwnerId } = useLocalSearchParams<{ logId: string; logOwnerId?: string }>();
  const logIdNum = parseInt(logId, 10);
  const logOwnerIdNum = logOwnerId ? parseInt(logOwnerId, 10) : undefined;
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { data: comments, isLoading, refetch } = trpc.comments.list.useQuery({ logId: logIdNum });
  const addMutation = trpc.comments.add.useMutation({
    onSuccess: () => {
      setComment("");
      refetch();
    },
  });

  const handleSend = async () => {
    const text = comment.trim();
    if (!text) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate({ logId: logIdNum, content: text, logOwnerId: logOwnerIdNum });
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
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
          <Text style={{ fontSize: 16, color: "#FF5C00" }}>← Back</Text>
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.foreground }}>
          Comments
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments ?? []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#FF5C00" + "30",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FF5C00" }}>
                  {item.profile?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
                    {item.profile?.displayName ?? "Unknown"}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <ActivityIndicator color="#FF5C00" />
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingTop: 40, gap: 8 }}>
                <Text style={{ fontSize: 32 }}>💬</Text>
                <Text style={{ fontSize: 15, color: colors.muted }}>No comments yet</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Be the first to cheer them on!
                </Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 16 }}
        />

        {/* Comment input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 0.5,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: Platform.OS === "ios" ? 24 : 12,
          }}
        >
          <TextInput
            ref={inputRef}
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment..."
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              color: colors.foreground,
              borderWidth: 1,
              borderColor: colors.border,
              maxHeight: 100,
            }}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!comment.trim() || addMutation.isPending}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
                !comment.trim() || addMutation.isPending
                  ? colors.border
                  : pressed
                  ? "#E05200"
                  : "#FF5C00",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            {addMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16 }}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
