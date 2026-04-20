import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

/**
 * Sets up the global notification handler so banners show while the app is foregrounded.
 * Call this once at the root layout level.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook that:
 * 1. Requests push notification permission on first mount.
 * 2. Registers the Expo push token with the backend.
 * 3. Listens for notification taps and deep-links the user to the correct screen.
 *
 * Must be called inside an authenticated context (after login).
 */
export function usePushNotifications() {
  const router = useRouter();
  const registerMutation = trpc.profile.registerPushToken.useMutation();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Push notifications are not supported on web
    if (Platform.OS === "web") return;

    let cancelled = false;

    async function registerForPushNotifications() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("[Push] Notification permission not granted");
          return;
        }

        // Get the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        if (cancelled) return;

        const token = tokenData.data;
        if (token) {
          registerMutation.mutate({ token });
        }
      } catch (err) {
        console.warn("[Push] Failed to register for push notifications:", err);
      }
    }

    registerForPushNotifications();

    // Handle notification taps (app in background/closed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string" && url) {
        router.push(url as any);
      }
    });

    // Handle the initial notification if the app was opened from a notification
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const url = lastResponse.notification.request.content.data?.url;
      if (typeof url === "string" && url) {
        // Delay slightly to allow navigation stack to mount
        setTimeout(() => router.push(url as any), 500);
      }
    }

    return () => {
      cancelled = true;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
