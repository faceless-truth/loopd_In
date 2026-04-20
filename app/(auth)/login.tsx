import { Image, Text, View, Pressable, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { useState } from "react";

export default function LoginScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await startOAuthLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      className="px-6"
    >
      <View className="flex-1 items-center justify-center gap-8">
        {/* Logo */}
        <View className="items-center gap-4">
          <Image
            source={require("../../assets/images/icon.png")}
            style={{ width: 96, height: 96, borderRadius: 22 }}
          />
          <View className="items-center gap-1">
            <Text className="text-4xl font-bold text-foreground">Accountable</Text>
            <Text className="text-base text-muted text-center">
              Build habits. Stay accountable.{"\n"}Celebrate with friends.
            </Text>
          </View>
        </View>

        {/* Feature highlights */}
        <View className="w-full gap-3">
          {[
            { icon: "✅", text: "Track your daily habits" },
            { icon: "🔥", text: "Maintain streaks and stay motivated" },
            { icon: "👥", text: "Share progress with friends" },
          ].map((item) => (
            <View key={item.text} className="flex-row items-center gap-3 bg-surface rounded-xl px-4 py-3">
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text className="text-sm text-foreground">{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Login button */}
        <View className="w-full gap-3">
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "#E05200" : "#FF5C00",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            })}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600" }}>
                Get Started
              </Text>
            )}
          </Pressable>
          <Text className="text-xs text-muted text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
