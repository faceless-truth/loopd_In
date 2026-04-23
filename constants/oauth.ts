import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.accountable.t20260420030550";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL: These values are hardcoded because the .env file is empty and env
// vars are only available in the dev sandbox process (via load-env.js). In a
// production APK build the build machine has no sandbox env vars, so all
// EXPO_PUBLIC_* values would be empty strings — breaking the OAuth flow.
// Hardcoding ensures the OAuth flow always works in every build context.
// ─────────────────────────────────────────────────────────────────────────────

/** Manus OAuth portal — always https://manus.im */
const HARDCODED_PORTAL_URL = "https://manus.im";

/** This app's Manus project / app ID */
const HARDCODED_APP_ID = "eEwWyPnnVHoRpc94TJ2rQE";

/**
 * The deployed production domain for this project.
 * This is the ONLY domain registered with the Manus OAuth portal as a valid
 * redirectUri. The sandbox URL (3000-xxx.sg1.manus.computer) is NOT registered
 * and the portal rejects it with "Permission denied — Redirect URI is not set".
 */
const HARDCODED_DEPLOYED_URL = "https://habittrack-eewwypnn.manus.space";

const env = {
  // Env vars take priority if set; hardcoded values are the fallback
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL || HARDCODED_PORTAL_URL,
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID || HARDCODED_APP_ID,
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  // Always falls back to the hardcoded deployed domain — this is the registered domain
  deployedApiUrl: process.env.EXPO_PUBLIC_DEPLOYED_API_URL || HARDCODED_DEPLOYED_URL,
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;
export const DEPLOYED_API_URL = env.deployedApiUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  // If API_BASE_URL is set, use it
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // Fallback to empty (will use relative URL)
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeBase64 = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 *
 * - Web: uses the sandbox API server callback endpoint (same-origin, no portal validation issue)
 * - Native: uses the DEPLOYED domain's /api/oauth/mobile endpoint.
 *
 * WHY THE DEPLOYED DOMAIN FOR NATIVE:
 * The Manus OAuth portal validates the redirectUri against the project's registered domains.
 * Only the deployed domain (habittrack-eewwypnn.manus.space) is registered — the sandbox
 * URL (3000-xxx.sg1.manus.computer) is NOT registered and the portal rejects it with
 * "Permission denied — Redirect URI is not set".
 *
 * The deployed domain always serves our Express server (confirmed), so the OAuth flow works:
 * 1. App opens portal with redirectUri = deployed domain + /api/oauth/mobile?appDeepLink=...
 * 2. Portal validates redirectUri → ACCEPTED (deployed domain is registered)
 * 3. Portal redirects to deployed domain with code + state
 * 4. Deployed server exchanges code for token
 * 5. Deployed server redirects to app deep link with session token
 *
 * The deep link is embedded as a query param in the redirectUri itself so the portal
 * forwards it back to our server (standard OAuth only forwards code + state).
 * The SDK decodes state as base64 to get the redirectUri for the token exchange —
 * so state MUST encode the full redirectUri including the appDeepLink param.
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    // Use the deployed domain as the base for the redirect URI.
    // DEPLOYED_API_URL is always set (hardcoded fallback guarantees this).
    const base = DEPLOYED_API_URL.replace(/\/$/, "");

    // Embed the app deep link as a query param in the redirectUri so the portal
    // forwards it back to our server (portal only forwards code + state, not custom params).
    const deepLink = Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
    const deepLinkEncoded = encodeBase64(deepLink);

    return `${base}/api/oauth/mobile?appDeepLink=${encodeURIComponent(deepLinkEncoded)}`;
  }
};

/**
 * Get the state parameter for the OAuth login URL.
 * The Manus OAuth SDK's exchangeCodeForToken() decodes `state` as base64 to
 * obtain the `redirectUri` sent in the token exchange POST to the portal.
 * Therefore state MUST always encode the full redirectUri (including any query params).
 */
export const getOAuthState = () => {
  // Always encode the redirectUri in state — the SDK decodes this and sends it
  // as the redirectUri in the token exchange request to the portal.
  return encodeBase64(getRedirectUri());
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = getOAuthState();

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), open the system browser directly so
 * the OAuth callback returns via deep link to the app.
 *
 * On web, this simply redirects to the login URL.
 *
 * @returns Always null, the callback is handled via deep link.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = getLoginUrl();

  if (ReactNative.Platform.OS === "web") {
    // On web, just redirect
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    console.warn("[OAuth] Cannot open login URL: URL scheme not supported");
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch (error) {
    console.error("[OAuth] Failed to open login URL:", error);
  }

  // The OAuth callback will reopen the app via deep link.
  return null;
}
