import { playStartCue } from "./audio-cue";

/**
 * Sequencial autoplay ("cascade") for the audio rows inside a card.
 *
 * When the user starts playing a track, every track listed after it plays
 * automatically one after the other (WhatsApp/Spotify-style queue), with a
 * short gap that follows MD3 motion timing. Only the tracks below the
 * anchor are queued — previous ones never auto-play.
 *
 * Behaviour rules:
 * - A user-started track becomes the new anchor: it pauses any other player,
 *   cancels any pending auto-start and clears the "next up" highlight.
 * - When the anchor ends, the following track is scheduled after `gapMs`.
 * - Pausing the active track (without it having ended) cancels the cascade.
 * - If an auto-started track fails to play, `onError` is called once and the
 *   cascade stops.
 * - `stop()` cancels any pending auto-start; it is also safe to call after
 *   the DOM was rebuilt (rows are checked via `isConnected`, so a stale timer
 *   can never start audio on a detached row).
 */
export interface CascadeEntry {
  player: HTMLAudioElement;
  playBtn: HTMLButtonElement;
  row: HTMLElement;
}

export interface AudioCascadeOptions {
  /** Gap between the end of a track and the start of the next (ms). */
  gapMs?: number;
  /** Called once when an auto-started track fails to play. */
  onError?: () => void;
}

export interface AudioCascade {
  /** Cancels any pending auto-start and clears the active/queued visual state. */
  stop(): void;
}

const NEXT_CLASS = "card__audio--next";
const DEFAULT_GAP_MS = 300;

export function createAudioCascade(entries: CascadeEntry[], options?: AudioCascadeOptions): AudioCascade {
  const gapMs = options?.gapMs ?? DEFAULT_GAP_MS;
  const onError = options?.onError;

  let current: number | null = null;
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const autoStarting = new Set<number>();

  const clearQueuedVisual = (): void => {
    for (const entry of entries) entry.row.classList.remove(NEXT_CLASS);
  };

  const cancelTimer = (): void => {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
      timer = null;
    }
  };

  const pauseOthers = (except: number): void => {
    for (let i = 0; i < entries.length; i++) {
      if (i === except) continue;
      const player = entries[i].player;
      if (!player.paused) player.pause();
    }
  };

  const stopCascade = (): void => {
    cancelTimer();
    current = null;
    autoStarting.clear();
    clearQueuedVisual();
  };

  const scheduleNext = (i: number): void => {
    const next = i + 1;
    if (next >= entries.length) {
      current = null;
      return;
    }
    const entry = entries[next];
    if (!entry.row.isConnected) {
      current = null;
      return;
    }

    entry.row.classList.add(NEXT_CLASS);
    timer = globalThis.setTimeout(() => {
      timer = null;
      clearQueuedVisual();
      if (!entry.row.isConnected) {
        current = null;
        return;
      }
      current = next;
      autoStarting.add(next);
      pauseOthers(next);
      playStartCue();
      entry.player.play().catch(() => {
        autoStarting.delete(next);
        stopCascade();
        onError?.();
      });
    }, gapMs);
  };

  entries.forEach((entry, i) => {
    const { player } = entry;

    player.addEventListener("play", () => {
      if (autoStarting.has(i)) {
        autoStarting.delete(i);
        return;
      }
      current = i;
      cancelTimer();
      pauseOthers(i);
      clearQueuedVisual();
    });

    player.addEventListener("ended", () => {
      if (current !== i) return;
      scheduleNext(i);
    });

    player.addEventListener("pause", () => {
      if (current === i && !player.ended) {
        stopCascade();
      }
    });
  });

  return { stop: stopCascade };
}
