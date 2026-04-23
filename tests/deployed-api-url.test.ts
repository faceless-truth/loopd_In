import { describe, it, expect } from "vitest";

describe("EXPO_PUBLIC_DEPLOYED_API_URL", () => {
  it("should be set and point to a valid domain", () => {
    const url = process.env.EXPO_PUBLIC_DEPLOYED_API_URL;
    expect(url).toBeTruthy();
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain("manus.space");
  });

  it("should serve the /api/oauth/mobile endpoint", async () => {
    const url = process.env.EXPO_PUBLIC_DEPLOYED_API_URL;
    // The endpoint should return 400 (missing params) or 500 (invalid code) — not 404
    const res = await fetch(`${url}/api/oauth/mobile?code=test&state=test`);
    // 500 means the endpoint exists but the code is invalid — that's expected
    expect([400, 500]).toContain(res.status);
  }, 15000);
});
