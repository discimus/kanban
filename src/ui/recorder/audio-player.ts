import { el, icon } from "@ui/components/dom";
import { t } from "@shared/i18n";
import { getAudioPlaybackUrl } from "./audio-url";
import { formatDuration } from "./inline-recorder";
import { playStartCue } from "./audio-cue";

export interface AudioPlayerControls {
  player: HTMLAudioElement;
  playBtn: HTMLButtonElement;
  /** Full-width linear progress track, hidden until playback starts. */
  progressBar: HTMLDivElement;
  /** Shows total duration at rest and remaining time (`–mm:ss`) while playing. */
  durationEl: HTMLSpanElement;
}

export interface AudioProgress {
  /** Played fraction, clamped to [0, 1]. */
  percent: number;
  /** Seconds left until the end, never negative. */
  remaining: number;
}

/**
 * Pure, NaN-safe playback progress math. `total`/`currentTime` may be
 * `NaN` or `Infinity` on some platforms (notably iOS blobs) before the
 * metadata is known; these fall back to a neutral value instead of
 * producing an invalid width.
 */
export function computeAudioProgress(total: number, currentTime: number): AudioProgress {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const safeCurrent = Number.isFinite(currentTime) && currentTime > 0 ? Math.min(currentTime, safeTotal) : 0;
  const percent = safeTotal > 0 ? safeCurrent / safeTotal : 0;
  return {
    percent: Math.min(1, Math.max(0, percent)),
    remaining: Math.max(0, safeTotal - safeCurrent)
  };
}

/**
 * Builds the hidden `<audio>` element, its play button, a progress bar and a
 * live duration counter, wiring playback and progress together.
 *
 * iOS/WebKit quirks handled here:
 * - Playback uses a fresh object URL per element (see audio-url.ts): reusing a
 *   blob URL after WebKit dropped its resource (when the previous element was
 *   destroyed on re-render) fails silently and makes play work only once.
 * - Replaying after the media ended resets `currentTime`; Safari otherwise
 *   ignores a second `play()` on an ended element.
 * - `play()` rejections are surfaced through `onError` instead of being
 *   swallowed by `void player.play()`.
 * - `player.duration` can be `NaN`/`Infinity` on blobs until the metadata
 *   loads, so the total is recomputed on every frame, falling back to the
 *   recorded `knownDuration`.
 *
 * Progress is driven by a `requestAnimationFrame` loop (only while `playing`)
 * instead of the ~4 Hz `timeupdate` event, which looks janky. The loop is
 * cancelled on pause/end so no work happens on detached elements.
 */
export function createAudioPlayer(
  dataUrl: string,
  onError?: () => void,
  knownDuration?: number
): AudioPlayerControls {
  const player = el("audio", { class: "card__audio-player", src: getAudioPlaybackUrl(dataUrl), preload: "metadata" }) as HTMLAudioElement;

  const playBtn = el("button", { class: "card__audio-play", "aria-label": t("card.reproduzirAudio"), type: "button" }, [icon("play_arrow")]) as HTMLButtonElement;
  const playIcon = () => playBtn.querySelector(".material-symbols-outlined")!;
  let playing = false;

  const durationEl = el("span", { class: "card__audio-duration" }) as HTMLSpanElement;
  durationEl.textContent = formatDuration(knownDuration ?? 0);

  const progressBar = el("div", {
    class: "card__audio-progress",
    role: "progressbar",
    "aria-label": t("audio.progress"),
    "aria-valuemin": "0",
    hidden: ""
  }) as HTMLDivElement;
  const progressFill = el("div", { class: "card__audio-progress-fill" }) as HTMLDivElement;
  progressBar.append(progressFill);

  let rafId: number | null = null;

  const resolveTotal = (): number => {
    const live = player.duration;
    return Number.isFinite(live) && live > 0 ? live : (knownDuration ?? 0);
  };

  const renderTick = (): void => {
    const total = resolveTotal();
    const { percent, remaining } = computeAudioProgress(total, player.currentTime);
    const elapsed = Math.min(Math.max(0, Math.floor(player.currentTime)), Math.floor(total));
    progressFill.setAttribute("style", `width:${Math.round(percent * 100)}%`);
    progressBar.setAttribute("aria-valuenow", String(elapsed));
    progressBar.setAttribute("aria-valuemax", String(Math.floor(total)));
    durationEl.textContent = `\u2013${formatDuration(remaining)}`;
    if (playing && typeof requestAnimationFrame === "function") {
      rafId = requestAnimationFrame(renderTick);
    } else {
      rafId = null;
    }
  };

  const startProgress = (): void => {
    progressBar.removeAttribute("hidden");
    durationEl.className = "card__audio-duration card__audio-duration--remaining";
    if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
    if (typeof requestAnimationFrame === "function") {
      rafId = requestAnimationFrame(renderTick);
    } else {
      renderTick();
    }
  };

  const stopProgress = (): void => {
    if (rafId !== null) {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
      rafId = null;
    }
    progressBar.setAttribute("hidden", "");
    durationEl.className = "card__audio-duration";
    durationEl.textContent = formatDuration(resolveTotal());
  };

  playBtn.addEventListener("click", () => {
    if (playing) {
      player.pause();
      return;
    }
    const freshStart = player.ended || player.currentTime === 0;
    if (player.ended) player.currentTime = 0;
    if (freshStart) playStartCue();
    player.play().catch(() => onError?.());
  });

  player.addEventListener("play", () => {
    playing = true;
    playIcon().textContent = "pause";
    startProgress();
  });
  player.addEventListener("pause", () => {
    playing = false;
    playIcon().textContent = "play_arrow";
    stopProgress();
  });
  player.addEventListener("ended", () => {
    playing = false;
    playIcon().textContent = "play_arrow";
    stopProgress();
  });

  return { player, playBtn, progressBar, durationEl };
}
