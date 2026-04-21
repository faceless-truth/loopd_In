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

const BRAND = "#7EB8F7";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

type TimeOfDay = "any_time" | "morning" | "afternoon" | "nighttime" | "custom";

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string; icon: string; hint: string }[] = [
  { value: "any_time",  label: "Any Time",  icon: "🕐", hint: "" },
  { value: "morning",   label: "Morning",   icon: "🌅", hint: "Before noon" },
  { value: "afternoon", label: "Afternoon", icon: "☀️", hint: "12pm – 5pm" },
  { value: "nighttime", label: "Night",     icon: "🌙", hint: "After 5pm" },
  { value: "custom",    label: "Custom",    icon: "⏰", hint: "Set a time" },
];

export default function CreateHabitScreen() {
  const colors = useColors();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HabitCategory>("Fitness");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [targetType, setTargetType] = useState<"boolean" | "numeric">("boolean");
  const [targetValue, setTargetValue] = useState("1");
  const [subGoalSteps, setSubGoalSteps] = useState("1");
  const [isPrivate, setIsPrivate] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("any_time");
  const [customTime, setCustomTime] = useState("08:00");

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
    const parsedTarget = parseInt(targetValue, 10) || 1;
    const parsedSteps = parseInt(subGoalSteps, 10) || 1;
    createMutation.mutate({
      title: title.trim(),
      category,
      frequencyType: frequency,
      targetType,
      targetValue: parsedTarget,
      subGoalSteps: parsedSteps,
      isPrivate,
      timeOfDay,
      customTime: timeOfDay === "custom" ? customTime : undefined,
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
          <Pressable onPress={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <ActivityIndicator color={BRAND} size="small" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND }}>Create</Text>
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
              placeholder="e.g. Morning Run, Drink 3L Water"
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
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>CATEGORY</Text>
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

          {/* Time of Day */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>
              TIME OF DAY
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {TIME_OF_DAY_OPTIONS.map((opt) => {
                const isSelected = timeOfDay === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setTimeOfDay(opt.value)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isSelected ? BRAND + "20" : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? BRAND : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{opt.icon}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? BRAND : colors.muted,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {timeOfDay === "custom" && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Set time (HH:MM)</Text>
                <TextInput
                  value={customTime}
                  onChangeText={(t) => setCustomTime(t)}
                  placeholder="08:00"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
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

          {/* Frequency */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>FREQUENCY</Text>
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
                      backgroundColor: isSelected ? BRAND : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? BRAND : colors.border,
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
                { value: "numeric", label: "# Count / Steps" },
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
                      backgroundColor: isSelected ? BRAND : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? BRAND : colors.border,
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
              <View style={{ gap: 16 }}>
                {/* Daily target */}
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    Daily target (total goal)
                  </Text>
                  <TextInput
                    value={targetValue}
                    onChangeText={(t) => setTargetValue(t.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    placeholder="e.g. 3"
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

                {/* Sub-goal steps */}
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                        🪜 Sub-goal steps
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        Break goal into smaller ticks (e.g. 3 steps of 1L for a 3L water goal)
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.muted }}>Number of steps</Text>
                    <TextInput
                      value={subGoalSteps}
                      onChangeText={(t) => setSubGoalSteps(t.replace(/[^0-9]/g, ""))}
                      keyboardType="number-pad"
                      placeholder="e.g. 3"
                      placeholderTextColor={colors.muted}
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        fontSize: 16,
                        color: colors.foreground,
                        borderWidth: 1,
                        borderColor: colors.border,
                        width: 100,
                      }}
                      returnKeyType="done"
                    />
                  </View>
                </View>
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
              trackColor={{ false: colors.border, true: BRAND }}
              thumbColor="#fff"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
