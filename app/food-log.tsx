import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const BRAND = "#7EB8F7";
const BRAND_PURPLE = "#A78BFA";

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snack", label: "Snack", emoji: "🍎" },
] as const;

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

function formatTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function AddFoodModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [notes, setNotes] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");

  const utils = trpc.useUtils();
  const addMutation = trpc.foodLogs.add.useMutation({
    onSuccess: () => {
      utils.foodLogs.list.invalidate();
      setMealType("breakfast");
      setNotes("");
      setPhotoBase64(null);
      setPhotoUri(null);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
    setMimeType(asset.mimeType ?? "image/jpeg");
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
    setMimeType(asset.mimeType ?? "image/jpeg");
  };

  const handleSave = () => {
    addMutation.mutate({
      mealType,
      notes: notes.trim() || undefined,
      photoBase64: photoBase64 ?? undefined,
      mimeType: photoBase64 ? mimeType : undefined,
    });
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
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>Log Meal</Text>
          <Pressable onPress={handleSave} disabled={addMutation.isPending}>
            {addMutation.isPending ? (
              <ActivityIndicator color={BRAND} size="small" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: BRAND }}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          {/* Meal type selector */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>MEAL TYPE</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {MEAL_TYPES.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMealType(m.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: mealType === m.key ? BRAND : colors.surface,
                    borderWidth: 1,
                    borderColor: mealType === m.key ? BRAND : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{m.emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: mealType === m.key ? "#fff" : colors.muted }}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Photo */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>PHOTO</Text>
            {photoUri ? (
              <View style={{ gap: 8 }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: 200, borderRadius: 14, backgroundColor: colors.surface }}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => { setPhotoUri(null); setPhotoBase64(null); }}
                  style={({ pressed }) => ({
                    alignSelf: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.7 : 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Text style={{ fontSize: 13, color: colors.muted }}>Remove photo</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={handleTakePhoto}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: BRAND + "15",
                    borderWidth: 1,
                    borderColor: BRAND + "40",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 22 }}>📷</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND }}>Camera</Text>
                </Pressable>
                <Pressable
                  onPress={handlePickPhoto}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: BRAND_PURPLE + "15",
                    borderWidth: 1,
                    borderColor: BRAND_PURPLE + "40",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 22 }}>🖼️</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND_PURPLE }}>Gallery</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>NOTES (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you eat? Any details..."
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
        </ScrollView>
      </ScreenContainer>
    </Modal>
  );
}

export default function FoodLogScreen() {
  const colors = useColors();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const today = todayISO();

  const { data: logs, isLoading, refetch } = trpc.foodLogs.list.useQuery({ date: today });
  const utils = trpc.useUtils();
  const deleteMutation = trpc.foodLogs.delete.useMutation({
    onSuccess: () => utils.foodLogs.list.invalidate(),
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleDelete = (logId: number) => {
    Alert.alert("Delete entry", "Remove this food log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ logId }),
      },
    ]);
  };

  const groupedByMeal = MEAL_TYPES.map((m) => ({
    ...m,
    entries: logs?.filter((l: any) => l.mealType === m.key) ?? [],
  }));

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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 16, color: BRAND }}>‹ Back</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Food Log</Text>
        <Pressable
          onPress={() => setShowAdd(true)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#6AA8E8" : BRAND,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 7,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>+ Add</Text>
        </Pressable>
      </View>

      {/* Date label */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
        <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600" }}>
          Today — {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
          {groupedByMeal.map((group) => (
            <View key={group.key} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 18 }}>{group.emoji}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
                  {group.label}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  ({group.entries.length} {group.entries.length === 1 ? "entry" : "entries"})
                </Text>
              </View>

              {group.entries.length === 0 ? (
                <Pressable
                  onPress={() => setShowAdd(true)}
                  style={({ pressed }) => ({
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    borderStyle: "dashed",
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 13, color: colors.muted }}>+ Log {group.label.toLowerCase()}</Text>
                </Pressable>
              ) : (
                group.entries.map((entry: any) => (
                  <Pressable
                    key={entry.id}
                    onLongPress={() => handleDelete(entry.id)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      marginBottom: 8,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    {entry.photoUrl && (
                      <Image
                        source={{ uri: entry.photoUrl }}
                        style={{ width: "100%", height: 160 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ padding: 12, gap: 4 }}>
                      {entry.notes ? (
                        <Text style={{ fontSize: 14, color: colors.foreground }}>{entry.notes}</Text>
                      ) : (
                        <Text style={{ fontSize: 14, color: colors.muted, fontStyle: "italic" }}>
                          No notes added
                        </Text>
                      )}
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {formatTime(entry.loggedAt)}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          ))}

          {logs?.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🍽️</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
                No meals logged today
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
                Tap + Add to start tracking your meals with photos.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <AddFoodModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </ScreenContainer>
  );
}
