import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

/**
 * Public profile view — stub for NF-3.
 * The Stack.Screen is registered in _layout.tsx; this file prevents a
 * navigation crash if any future caller routes to /profile/[userId].
 * Full implementation is scheduled for Phase 8 (M11 / profile edit).
 */
export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const colors = useColors();

  const { data: profile, isLoading, isError } = trpc.profile.get.useQuery(undefined, {
    enabled: false, // placeholder — real query will use userId once the route is wired
  });

  useEffect(() => {
    // Until the full profile-by-userId endpoint exists, redirect back gracefully
    if (isError || (!isLoading && !profile)) {
      router.back();
    }
  }, [isError, isLoading, profile]);

  return (
    <ScreenContainer className="items-center justify-center gap-4">
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        Loading profile…
      </Text>
    </ScreenContainer>
  );
}
