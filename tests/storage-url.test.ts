import { describe, expect, it } from "vitest";
import { resolveStorageUrlWith } from "../shared/storage-url";

const WEB = { platform: "web" as const, baseUrl: "https://api.example.com" };
const IOS = { platform: "ios" as const, baseUrl: "https://api.example.com" };
const IOS_NO_BASE = { platform: "ios" as const, baseUrl: "" };

describe("resolveStorageUrlWith", () => {
  it("returns undefined for null/undefined/empty", () => {
    expect(resolveStorageUrlWith(WEB, null)).toBeUndefined();
    expect(resolveStorageUrlWith(WEB, undefined)).toBeUndefined();
    expect(resolveStorageUrlWith(WEB, "")).toBeUndefined();
  });

  it("passes absolute https URL through on any platform", () => {
    const abs = "https://cdn.example.com/p.jpg";
    expect(resolveStorageUrlWith(WEB, abs)).toBe(abs);
    expect(resolveStorageUrlWith(IOS, abs)).toBe(abs);
  });

  it("passes absolute http URL through on any platform", () => {
    const abs = "http://example.com/p.jpg";
    expect(resolveStorageUrlWith(IOS, abs)).toBe(abs);
  });

  it("returns relative path unchanged on web", () => {
    expect(resolveStorageUrlWith(WEB, "/manus-storage/abc.jpg")).toBe(
      "/manus-storage/abc.jpg",
    );
  });

  it("prefixes relative path with baseUrl on native", () => {
    expect(resolveStorageUrlWith(IOS, "/manus-storage/abc.jpg")).toBe(
      "https://api.example.com/manus-storage/abc.jpg",
    );
  });

  it("returns non-leading-slash relative path unchanged on native (conservative)", () => {
    expect(resolveStorageUrlWith(IOS, "manus-storage/abc.jpg")).toBe(
      "manus-storage/abc.jpg",
    );
  });

  it("returns relative unchanged on native when baseUrl is empty", () => {
    expect(
      resolveStorageUrlWith(IOS_NO_BASE, "/manus-storage/abc.jpg"),
    ).toBe("/manus-storage/abc.jpg");
  });

  it("is case-insensitive about the http/https scheme check", () => {
    expect(resolveStorageUrlWith(IOS, "HTTPS://x.com/y")).toBe(
      "HTTPS://x.com/y",
    );
  });

  it("passes data: URIs through on native (avatar dataUri case)", () => {
    const dataUri = "data:image/jpeg;base64,AAAA";
    expect(resolveStorageUrlWith(IOS, dataUri)).toBe(dataUri);
  });

  it("passes file:// URIs through on native", () => {
    const fileUri = "file:///var/mobile/tmp/photo.jpg";
    expect(resolveStorageUrlWith(IOS, fileUri)).toBe(fileUri);
  });

  it("passes blob: URIs through on web", () => {
    const blob = "blob:https://x.com/abcd";
    expect(resolveStorageUrlWith(WEB, blob)).toBe(blob);
  });
});
