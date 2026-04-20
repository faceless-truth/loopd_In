// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for Accountable.
 */
const MAPPING = {
  // Navigation / Tab bar
  "house.fill": "home",
  "newspaper.fill": "dynamic-feed",
  "person.2.fill": "people",
  "person.fill": "person",
  // Actions
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "checkmark.circle": "radio-button-unchecked",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "pencil": "edit",
  "trash": "delete",
  "camera.fill": "camera-alt",
  "photo": "photo-library",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.left.forwardslash.chevron.right": "code",
  "paperplane.fill": "send",
  // Social
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "bubble.left.fill": "chat-bubble",
  "bubble.left": "chat-bubble-outline",
  "person.badge.plus": "person-add",
  "person.badge.checkmark": "how-to-reg",
  // Misc
  "flame.fill": "local-fire-department",
  "star.fill": "star",
  "gear": "settings",
  "bell.fill": "notifications",
  "magnifyingglass": "search",
  "lock.fill": "lock",
  "globe": "public",
  "photo.fill": "image",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
