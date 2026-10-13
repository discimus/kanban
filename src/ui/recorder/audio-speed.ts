import { getLocale } from "@shared/i18n";

/**
 * Playback speeds offered by the per-card audio speed pill. Kept as a pure,
 * DOM-free module so the cycling logic is trivially unit-testable. `1` is
 * always the starting rate and the value every track resets to.
 */
export const PLAYBACK_RATES = [1, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/**
 * Returns the next speed in the cycle (1 -> 1.5 -> 2 -> 1). An unknown or
 * invalid current value falls back to the first rate instead of returning
 * `undefined`.
 */
export function nextPlaybackRate(current: number): PlaybackRate {
  const index = PLAYBACK_RATES.indexOf(current as PlaybackRate);
  if (index === -1) return PLAYBACK_RATES[0];
  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length];
}

/**
 * Human label for a speed, localized ("1,5×" in pt-BR, "1.5×" in en-US).
 * An optional `locale` makes the output deterministic in tests.
 */
export function formatPlaybackRate(rate: number, locale?: string): string {
  const resolved = locale ?? (getLocale() === "en" ? "en-US" : "pt-BR");
  return `${rate.toLocaleString(resolved, { maximumFractionDigits: 1 })}\u00d7`;
}
