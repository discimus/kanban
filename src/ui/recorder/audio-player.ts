import { el, icon } from "@ui/components/dom";
import { t } from "@shared/i18n";
import { getAudioPlaybackUrl } from "./audio-url";

export interface AudioPlayerControls {
  player: HTMLAudioElement;
  playBtn: HTMLButtonElement;
}

/**
 * Builds the hidden `<audio>` element and its play button, wiring playback.
 *
 * iOS/WebKit quirks handled here:
 * - Playback uses a fresh object URL per element (see audio-url.ts): reusing a
 *   blob URL after WebKit dropped its resource (when the previous element was
 *   destroyed on re-render) fails silently and makes play work only once.
 * - Replaying after the media ended resets `currentTime`; Safari otherwise
 *   ignores a second `play()` on an ended element.
 * - `play()` rejections are surfaced through `onError` instead of being
 *   swallowed by `void player.play()`.
 */
export function createAudioPlayer(
  dataUrl: string,
  onError?: () => void
): AudioPlayerControls {
  const player = el("audio", { class: "card__audio-player", src: getAudioPlaybackUrl(dataUrl), preload: "metadata" }) as HTMLAudioElement;

  const playBtn = el("button", { class: "card__audio-play", "aria-label": t("card.reproduzirAudio"), type: "button" }, [icon("play_arrow")]) as HTMLButtonElement;
  const playIcon = () => playBtn.querySelector(".material-symbols-outlined")!;
  let playing = false;

  playBtn.addEventListener("click", () => {
    if (playing) {
      player.pause();
      return;
    }
    if (player.ended) player.currentTime = 0;
    player.play().catch(() => onError?.());
  });

  player.addEventListener("play", () => { playing = true; playIcon().textContent = "pause"; });
  player.addEventListener("pause", () => { playing = false; playIcon().textContent = "play_arrow"; });
  player.addEventListener("ended", () => { playing = false; playIcon().textContent = "play_arrow"; });

  return { player, playBtn };
}
