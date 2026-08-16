/**
 * Apple/iOS platform detection.
 *
 * iOS Safari does not offer a reliable MediaRecorder MP4 encoder (WebKit has
 * shipped several `audio/mp4` regressions), so recording is routed to a raw
 * PCM -> WAV capture there. Detection must be defensive: `navigator` or
 * `navigator.userAgent` may be missing in non-browser environments (node
 * tests, SSR), in which case `isAppleIOS` reports `false`.
 */

export interface IOSDetectionInput {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

/** Pure decision: true for iPhone/iPad/iPod and for iPadOS 13+ (which reports
 *  `MacIntel` but has touch). Kept side-effect free for testing. */
export function isIOSLike({ userAgent, platform, maxTouchPoints }: IOSDetectionInput): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1 && !/Android/.test(userAgent);
}

/** Reads the current environment. Returns false when `navigator` is absent. */
export function isAppleIOS(): boolean {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (!nav) return false;
  return isIOSLike({
    userAgent: nav.userAgent ?? "",
    platform: nav.platform ?? "",
    maxTouchPoints: nav.maxTouchPoints ?? 0
  });
}
