import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface PhotoProofSheetProps {
  visible: boolean;
  logId: number | null;
  habitTitle: string;
  onClose: () => void;
  onPhotoUploaded?: (url: string) => void;
}

export function PhotoProofSheet({
  visible,
  logId,
  habitTitle,
  onClose,
  onPhotoUploaded,
}: PhotoProofSheetProps) {
  const colors = useColors();
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const uploadMutation = trpc.logs.uploadPhoto.useMutation({
    onSuccess: (data) => {
      onPhotoUploaded?.(data.url);
      handleClose();
    },
    onError: (err) => {
      Alert.alert("Upload failed", err.message);
      setUploading(false);
    },
  });

  const handleOpen = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSelectedUri(null);
      setUploading(false);
      onClose();
    });
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!selectedUri || !logId) return;
    setUploading(true);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(selectedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      uploadMutation.mutate({ logId, base64, mimeType: "image/jpeg" });
    } catch {
      Alert.alert("Error", "Could not read the image. Please try again.");
      setUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={handleOpen}
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={handleClose}
      />

      {/* Sheet */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: Platform.OS === "ios" ? 40 : 24,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Handle */}
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 2,
            alignSelf: "center",
            marginTop: 12,
            marginBottom: 20,
          }}
        />

        {/* Header */}
        <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
          <Text
            style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, marginBottom: 4 }}
          >
            📸 Add Photo Proof
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            Show your friends you completed "{habitTitle}"
          </Text>
        </View>

        {/* Preview */}
        {selectedUri ? (
          <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
            <Image
              source={{ uri: selectedUri }}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 16,
                backgroundColor: colors.surface,
              }}
              resizeMode="cover"
            />
            <Pressable
              onPress={() => setSelectedUri(null)}
              style={{
                position: "absolute",
                top: 8,
                right: 32,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 24,
              gap: 12,
              marginBottom: 20,
            }}
          >
            {/* Camera option */}
            <Pressable
              onPress={takePhoto}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? colors.border : colors.surface,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                Camera
              </Text>
            </Pressable>

            {/* Library option */}
            <Pressable
              onPress={pickFromLibrary}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: pressed ? colors.border : colors.surface,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text style={{ fontSize: 32 }}>🖼️</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                Library
              </Text>
            </Pressable>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ paddingHorizontal: 24, gap: 10 }}>
          {selectedUri && (
            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#E05200" : "#FF5C00",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: uploading ? 0.7 : 1,
              })}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                  Share Proof 🔥
                </Text>
              )}
            </Pressable>
          )}

          <Pressable
            onPress={handleClose}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.border : colors.surface,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            })}
          >
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "500" }}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
