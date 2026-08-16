import { dataUrlToBlob } from "@shared/storage/blob-store";

/**
 * iOS Safari does not reliably play base64 `data:` URLs through the `<audio>`
 * element. Playback is routed through object URLs (`URL.createObjectURL`)
 * instead, which load and play consistently across browsers.
 *
 * Object URLs are cached per dataUrl so re-renders reuse the same handle (no
 * churn, no revoked-while-visible URLs). Call {@link releaseAudioPlaybackUrl}
 * when an audio is deleted so the underlying blob memory is freed.
 */

const objectUrls = new Map<string, string>();

/**
 * Resolves an audio data URL into a cached object URL. `mimeType` is used to
 * type the underlying Blob when the data URL itself carries no mime (older
 * records can end up as `data:;base64,...`), which iOS Safari refuses to
 * decode without a type hint.
 */
export function getAudioPlaybackUrl(dataUrl: string, mimeType?: string): string {
  if (!dataUrl) return "";
  const cached = objectUrls.get(dataUrl);
  if (cached) return cached;
  const url = URL.createObjectURL(dataUrlToBlob(dataUrl, mimeType));
  objectUrls.set(dataUrl, url);
  return url;
}

export function releaseAudioPlaybackUrl(dataUrl: string): void {
  const url = objectUrls.get(dataUrl);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(dataUrl);
  }
}

export function clearAudioPlaybackUrls(): void {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
}
