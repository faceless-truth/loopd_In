import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Text } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function PendingBadge() {
  const { data: pending } = trpc.friends.pending.useQuery();
  const count = pending?.length ?? 0;
  if (count === 0) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -4,
        right: -8,
        backgroundColor: "#7EB8F7",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="newspaper.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={26} name="person.2.fill" color={color} />
              <PendingBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: "Challenges",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="trophy.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
