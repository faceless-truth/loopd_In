import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProfileSetupScreen() {
  const colors = useColors();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const setupMutation = trpc.profile.setup.useMutation({
    onSuccess: () => {
      router.replace("/(tabs)");
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleSubmit = () => {
    if (!displayName.trim()) {
      Alert.alert("Required", "Please enter your display name.");
      return;
    }
    if (!username.trim() || username.length < 2) {
      Alert.alert("Required", "Username must be at least 2 characters.");
      return;
    }
    setupMutation.mutate({ displayName: displayName.trim(), username: username.trim() });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, justifyContent: "center", gap: 32 }}>
            {/* Header */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: colors.foreground,
                }}
              >
                Set up your profile
              </Text>
              <Text style={{ fontSize: 15, color: colors.muted }}>
                How should your friends know you?
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
                  DISPLAY NAME
                </Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Alex Johnson"
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
                  autoCapitalize="words"
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
                  USERNAME
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.muted }}>@</Text>
                  <TextInput
                    value={username}
                    onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="yourusername"
                    placeholderTextColor={colors.muted}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingLeft: 4,
                      fontSize: 16,
                      color: colors.foreground,
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  Letters, numbers, and underscores only.
                </Text>
              </View>
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={setupMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#E05200" : "#FF5C00",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: setupMutation.isPending ? 0.7 : 1,
              })}
            >
              {setupMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600" }}>
                  Continue
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
