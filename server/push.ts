/**
 * Expo Push Notification helper for Accountable.
 * Uses the Expo Push API to send notifications to users via their stored push tokens.
 */

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification to a single Expo push token.
 * Silently ignores failures to avoid breaking the calling mutation.
 */
export async function sendPushNotification(
  expoPushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) {
    return; // Not a valid Expo push token — skip silently
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    title,
    body,
    sound: "default",
    data: data ?? {},
  };

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.warn("[Push] Expo API returned non-OK status:", response.status);
      return;
    }

    const result = await response.json() as { data: ExpoPushTicket };
    if (result.data?.status === "error") {
      console.warn("[Push] Expo push error:", result.data.message, result.data.details);
    }
  } catch (err) {
    // Non-blocking: log and continue
    console.warn("[Push] Failed to send push notification:", err);
  }
}

/**
 * Send push notifications to multiple tokens in a single batch request.
 */
export async function sendPushNotificationBatch(
  messages: Array<{ token: string; title: string; body: string; data?: Record<string, unknown> }>
): Promise<void> {
  const validMessages = messages
    .filter((m) => m.token?.startsWith("ExponentPushToken["))
    .map((m): ExpoPushMessage => ({
      to: m.token,
      title: m.title,
      body: m.body,
      sound: "default",
      data: m.data ?? {},
    }));

  if (validMessages.length === 0) return;

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validMessages),
    });

    if (!response.ok) {
      console.warn("[Push] Expo batch API returned non-OK status:", response.status);
    }
  } catch (err) {
    console.warn("[Push] Failed to send batch push notifications:", err);
  }
}
