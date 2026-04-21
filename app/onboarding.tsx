import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
  ViewToken,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BRAND = "#7EB8F7";
const BRAND_PURPLE = "#A78BFA";
const ONBOARDING_KEY = "loopd_in_onboarding_seen";

const STEPS = [
  {
    emoji: "✅",
    title: "Build your habits",
    description:
      "Create daily or weekly habits with time-of-day scheduling, sub-goals, and custom targets. Track your progress every day.",
    accent: BRAND,
    bg: "#EBF5FF",
    bgDark: "#1a2a3a",
  },
  {
    emoji: "👥",
    title: "Invite your friends",
    description:
      "Connect with friends to see their habit completions in your social feed. React with 🔥❤️💪 and leave encouraging comments.",
    accent: BRAND_PURPLE,
    bg: "#F3EEFF",
    bgDark: "#1e1a2e",
  },
  {
    emoji: "🏆",
    title: "Start a challenge",
    description:
      "Create group challenges, invite friends, and compete on a live leaderboard. Completing matching habits auto-syncs your score.",
    accent: "#F59E0B",
    bg: "#FFFBEB",
    bgDark: "#2a2010",
  },
];

export const ONBOARDING_SEEN_KEY = ONBOARDING_KEY;

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const dotAnimations = STEPS.map(() => useRef(new Animated.Value(0)).current);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const idx = viewableItems[0].index ?? 0;
        setActiveIndex(idx);
      }
    }
  ).current;

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (activeIndex < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.replace("/(tabs)" as any);
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)" as any);
  };

  const isLast = activeIndex === STEPS.length - 1;
  const step = STEPS[activeIndex];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      {/* Skip button */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        {!isLast && (
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
          >
            <Text style={{ fontSize: 15, color: colors.muted, fontWeight: "500" }}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slide carousel */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View
            style={{
              width: SCREEN_WIDTH,
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
              gap: 24,
            }}
          >
            {/* Illustration circle */}
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: item.accent + "20",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: item.accent + "40",
              }}
            >
              <Text style={{ fontSize: 72 }}>{item.emoji}</Text>
            </View>

            {/* Text */}
            <View style={{ alignItems: "center", gap: 12 }}>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "800",
                  color: colors.foreground,
                  textAlign: "center",
                  letterSpacing: -0.5,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.muted,
                  textAlign: "center",
                  lineHeight: 24,
                }}
              >
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Dots + CTA */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 32,
          gap: 24,
          alignItems: "center",
        }}
      >
        {/* Dot indicators */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {STEPS.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => flatListRef.current?.scrollToIndex({ index: i, animated: true })}
            >
              <View
                style={{
                  width: i === activeIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === activeIndex ? step.accent : colors.border,
                }}
              />
            </Pressable>
          ))}
        </View>

        {/* Primary CTA */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => ({
            width: "100%",
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            backgroundColor: pressed
              ? step.accent + "CC"
              : step.accent,
            shadowColor: step.accent,
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          })}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
            {isLast ? "Get Started 🚀" : "Next"}
          </Text>
        </Pressable>

        {/* Step counter */}
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {activeIndex + 1} of {STEPS.length}
        </Text>
      </View>
    </ScreenContainer>
  );
}
