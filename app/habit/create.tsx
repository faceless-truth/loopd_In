import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { HABIT_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, HabitCategory } from "@/shared/types";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

export default function CreateHabitScreen() {
  const colors = useColors();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HabitCategory>("Fitness");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [targetType, setTargetType] = useState<"boolean" | "numeric">("boolean");
  const [targetValue, setTargetValue] = useState("1");
  const [isPrivate, setIsPrivate] = useState(false);

  const utils = trpc.useUtils();
  const createMutation = trpc.habits.create.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      router.back();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a habit name.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      category,
      frequencyType: frequency,
      targetType,
      targetValue: parseInt(targetValue, 10) || 1,
      isPrivate,
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 16, color: colors.muted }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
            New Habit
          </Text>
          <Pressable
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#FF5C00" size="small" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FF5C00" }}>
                Create
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
              HABIT NAME *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Morning Run, Read 30 mins"
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
              returnKeyType="done"
              autoFocus
            />
          </View>

          {/* Category */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
              CATEGORY
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {HABIT_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const color = CATEGORY_COLORS[cat];
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isSelected ? color + "20" : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? color : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{CATEGORY_ICONS[cat]}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? color : colors.muted,
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Frequency */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
              FREQUENCY
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = frequency === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFrequency(opt.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: isSelected ? "#FF5C00" : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? "#FF5C00" : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isSelected ? "#fff" : colors.muted,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Target Type */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
              TRACKING TYPE
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { value: "boolean", label: "✓ Done / Not done" },
                { value: "numeric", label: "# Count target" },
              ].map((opt) => {
                const isSelected = targetType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setTargetType(opt.value as "boolean" | "numeric")}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: isSelected ? "#FF5C00" : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? "#FF5C00" : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? "#fff" : colors.muted,
                        textAlign: "center",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {targetType === "numeric" && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Daily target count</Text>
                <TextInput
                  value={targetValue}
                  onChangeText={(t) => setTargetValue(t.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: colors.foreground,
                    borderWidth: 1,
                    borderColor: colors.border,
                    width: 120,
                  }}
                  returnKeyType="done"
                />
              </View>
            )}
          </View>

          {/* Privacy */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                🔒 Private habit
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                Won't appear in friends' feeds
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: "#FF5C00" }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
