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

export function getAudioPlaybackUrl(dataUrl: string): string {
  if (!dataUrl) return "";
  const cached = objectUrls.get(dataUrl);
  if (cached) return cached;
  const url = URL.createObjectURL(dataUrlToBlob(dataUrl));
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
