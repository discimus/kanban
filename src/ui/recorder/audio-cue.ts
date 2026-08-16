/**
 * Short, synthesized "start" cue (Web Audio API) played right when a track is
 * about to begin. A soft sine blip with a fast attack/decay envelope reads as
 * a gentle sonification cue (MD3-style feedback) instead of an alert.
 *
 * Zero runtime dependencies and no asset files: the tone is generated at
 * runtime. Guards:
 * - No-op when Web Audio is unavailable (older browsers / node test env).
 * - A single shared AudioContext is reused (browsers cap the number of live
 *   contexts) and resumed if suspended by the autoplay policy.
 * - Any Web Audio failure is swallowed so the cue can never break playback.
 */

export interface StartCueOptions {
  /** Oscillator frequency in Hz. */
  frequency?: number;
  /** Cue length in ms. */
  durationMs?: number;
  /** Peak gain 0..1. */
  volume?: number;
}

const DEFAULT_FREQUENCY = 800;
const DEFAULT_DURATION_MS = 110;
const DEFAULT_VOLUME = 0.18;

type AudioContextConstructor = new () => AudioContext;

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  const globalWithWebkit = globalThis as { webkitAudioContext?: AudioContextConstructor };
  const Ctor: AudioContextConstructor | undefined =
    typeof AudioContext !== "undefined"
      ? AudioContext
      : typeof globalWithWebkit.webkitAudioContext !== "undefined"
        ? globalWithWebkit.webkitAudioContext
        : undefined;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
}

export function playStartCue(options: StartCueOptions = {}): void {
  playTone(options);
}

export interface RecordingStartCueOptions extends StartCueOptions {
  /** Frequency of the second blip in Hz. */
  frequencySecond?: number;
  /** Gap between the two blips in ms. */
  gapMs?: number;
}

const DEFAULT_RECORD_FREQUENCY = 988;
const DEFAULT_RECORD_FREQUENCY_SECOND = 1319;
const DEFAULT_RECORD_DURATION_MS = 75;
const DEFAULT_RECORD_GAP_MS = 80;
const DEFAULT_RECORD_VOLUME = 0.16;

/**
 * Distinct "recording started" cue: two short ascending blips (B5 -> E6) that
 * read as "ready, go" instead of the single playback cue. It plays through the
 * speakers while the mic is already live, so the volume is kept low and the
 * cue very short to avoid feedback into the recording.
 */
export function playRecordingStartCue(options: RecordingStartCueOptions = {}): void {
  const frequency = options.frequency ?? DEFAULT_RECORD_FREQUENCY;
  const frequencySecond = options.frequencySecond ?? DEFAULT_RECORD_FREQUENCY_SECOND;
  const durationMs = options.durationMs ?? DEFAULT_RECORD_DURATION_MS;
  const gapMs = options.gapMs ?? DEFAULT_RECORD_GAP_MS;
  const volume = options.volume ?? DEFAULT_RECORD_VOLUME;

  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const now = context.currentTime;
    const firstStart = now;
    const secondStart = now + gapMs / 1000;

    playTone({ frequency, durationMs, volume, startAt: firstStart, context });
    playTone({ frequency: frequencySecond, durationMs, volume, startAt: secondStart, context });
  } catch {
    // The cue is a non-critical affordance; never let it break recording.
  }
}

interface ToneOptions extends StartCueOptions {
  startAt?: number;
  context?: AudioContext;
}

function playTone(options: ToneOptions = {}): void {
  const frequency = options.frequency ?? DEFAULT_FREQUENCY;
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
  const volume = options.volume ?? DEFAULT_VOLUME;

  try {
    const context = options.context ?? getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();

    const now = options.startAt ?? context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);

    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    });
  } catch {
    // The cue is a non-critical affordance; never let it break playback.
  }
}
