import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-linking
vi.mock("expo-linking", () => ({
  createURL: (path: string, opts: { scheme: string }) => `${opts.scheme}:/${path}`,
  canOpenURL: vi.fn().mockResolvedValue(true),
  openURL: vi.fn().mockResolvedValue(undefined),
}));

// Mock react-native Platform
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("OAuth Flow - Native Redirect URI", () => {
  beforeEach(() => {
    // Set env vars
    process.env.EXPO_PUBLIC_DEPLOYED_API_URL = "https://habittrack-eewwypnn.manus.space";
    process.env.EXPO_PUBLIC_APP_ID = "eEwWyPnnVHoRpc94TJ2rQE";
    process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL = "https://manus.im";
    process.env.EXPO_PUBLIC_OAUTH_SERVER_URL = "https://api.manus.im";
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://3000-sandbox.sg1.manus.computer";
  });

  it("should use the deployed domain as redirectUri on native (not sandbox URL)", async () => {
    const { getRedirectUri } = await import("../constants/oauth");
    const redirectUri = getRedirectUri();
    
    // Must use deployed domain, NOT sandbox URL
    expect(redirectUri).toContain("habittrack-eewwypnn.manus.space");
    expect(redirectUri).not.toContain("3000-sandbox.sg1.manus.computer");
    expect(redirectUri).toContain("/api/oauth/mobile");
  });

  it("should embed the app deep link in the redirectUri", async () => {
    const { getRedirectUri } = await import("../constants/oauth");
    const redirectUri = getRedirectUri();
    
    // Must contain appDeepLink param
    expect(redirectUri).toContain("appDeepLink=");
    
    // The appDeepLink must be base64-encoded
    const url = new URL(redirectUri);
    const appDeepLinkEncoded = url.searchParams.get("appDeepLink");
    expect(appDeepLinkEncoded).toBeTruthy();
    
    // Decode and verify it's a valid deep link
    const decoded = Buffer.from(appDeepLinkEncoded!, "base64").toString("utf-8");
    expect(decoded).toContain("manus");
    expect(decoded).toContain("://");
    expect(decoded).toContain("/oauth/callback");
  });

  it("should encode the full redirectUri (with appDeepLink) in state", async () => {
    const { getRedirectUri, getOAuthState } = await import("../constants/oauth");
    const redirectUri = getRedirectUri();
    const state = getOAuthState();
    
    // State must decode to the full redirectUri
    const decodedState = Buffer.from(state, "base64").toString("utf-8");
    expect(decodedState).toBe(redirectUri);
    
    // The decoded state must contain the deployed domain
    expect(decodedState).toContain("habittrack-eewwypnn.manus.space");
    expect(decodedState).toContain("/api/oauth/mobile");
    expect(decodedState).toContain("appDeepLink=");
  });

  it("should build a valid login URL with all required params", async () => {
    const { getLoginUrl } = await import("../constants/oauth");
    const loginUrl = getLoginUrl();
    
    const url = new URL(loginUrl);
    expect(url.hostname).toBe("manus.im");
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("appId")).toBe("eEwWyPnnVHoRpc94TJ2rQE");
    expect(url.searchParams.get("redirectUri")).toContain("habittrack-eewwypnn.manus.space");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("type")).toBe("signIn");
    
    // Should NOT have appDeepLink as a top-level param (it's embedded in redirectUri)
    expect(url.searchParams.has("appDeepLink")).toBe(false);
  });
});
