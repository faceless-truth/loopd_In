/**
 * Pure storage-URL resolver. No React Native imports; safe to import
 * from anywhere including vitest.
 *
 * storagePut() on the server returns paths like `/manus-storage/<key>`.
 * On web, `<img src="/manus-storage/…">` resolves against the current
 * origin. On native, <Image source={{ uri: "/manus-storage/…" }} />
 * has no origin to resolve against and the fetch fails silently, so
 * photos never render on iOS/Android.
 *
 * The runtime wrapper in lib/storage-url.ts plugs Platform and
 * getApiBaseUrl() into this function.
 */

type Platformish = "web" | "ios" | "android" | "windows" | "macos";

// Matches the scheme segment of any URI (http, https, data, file, blob,
// content, ph, etc.). If this matches, the URL already knows how to
// resolve itself and we must not prefix it.
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Pure resolver for tests and server use.
 *
 * - undefined/null/empty → undefined
 * - any scheme-prefixed URI (http, https, data, file, blob, …) → unchanged
 * - web + path-relative → returned unchanged (browser resolves it)
 * - native + path-relative starting with "/" + baseUrl → prefixed
 * - anything else → returned unchanged (conservative: never mangle input)
 */
export function resolveStorageUrlWith(
  deps: { platform: Platformish; baseUrl: string },
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  if (SCHEME_RE.test(url)) return url;
  if (deps.platform === "web") return url;
  if (!deps.baseUrl) return url;
  if (!url.startsWith("/")) return url;
  return `${deps.baseUrl}${url}`;
}
