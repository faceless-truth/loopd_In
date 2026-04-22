import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import { resolveStorageUrlWith } from "@/shared/storage-url";

export { resolveStorageUrlWith } from "@/shared/storage-url";

/**
 * Runtime storage-URL resolver for UI code. Wraps the pure helper with
 * the live Platform.OS and API base URL.
 *
 * See shared/storage-url.ts for the behaviour contract and test suite.
 */
export function resolveStorageUrl(
  url: string | null | undefined,
): string | undefined {
  return resolveStorageUrlWith(
    // Platform.OS is typed as a union that includes "native"; the pure
    // function only needs web vs non-web, so a cast is safe here.
    { platform: Platform.OS as "web" | "ios" | "android", baseUrl: getApiBaseUrl() },
    url,
  );
}
