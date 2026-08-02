import { el, icon } from "@ui/components/dom";
import { startRecording, type AudioRecorderController, type RecordedAudio } from "./audio-recorder";
import { t } from "@shared/i18n";

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export interface ActiveRecording {
  controller: AudioRecorderController;
  startedAt: number;
}

export interface InlineRecorderOptions {
  /** Injected recorder factory; defaults to the MediaRecorder wrapper. Testable. */
  startRecordingFn?: () => Promise<AudioRecorderController>;
  /** Resolves the timer label element for an id; defaults to the card selector. */
  getTimerEl?: (id: string) => HTMLElement | null;
  /** Called once the recording is live (mic granted). */
  onStarted?: (id: string) => void;
  /** Called when starting or stopping fails. */
  onError?: (id: string, error: unknown) => void;
}

export interface InlineRecorder {
  isRecording(id: string): boolean;
  isStarting(id: string): boolean;
  getActive(id: string): ActiveRecording | undefined;
  start(id: string, onResult: (result: RecordedAudio) => void): void;
  stop(id: string): void;
}

interface RecordingEntry extends ActiveRecording {
  onResult: (result: RecordedAudio) => void;
}

/**
 * Inline audio recording, keyed by an arbitrary entity id (backlog item,
 * sticky card). Holds its registry at module/instance level so a full
 * re-render (`renderApp` → `clear(root)`) doesn't drop an in-flight
 * recording; callers read `getActive(id)` to render the live state.
 *
 * The `onResult` handler is captured at `start` so the manual stop button runs
 * the exact same save flow as any other stop path.
 */
export function createInlineRecorder(options: InlineRecorderOptions = {}): InlineRecorder {
  const startRecordingFn = options.startRecordingFn ?? startRecording;
  const getTimerEl = options.getTimerEl ?? ((id: string) =>
    document.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"] .card__recorder-timer`));

  const activeRecordings = new Map<string, RecordingEntry>();
  const startingRecordings = new Set<string>();
  let recorderTimer: number | null = null;

  const ensureTimer = (): void => {
    if (recorderTimer !== null) return;
    recorderTimer = setInterval(() => {
      for (const [id, rec] of activeRecordings) {
        const label = getTimerEl(id);
        const elapsed = (Date.now() - rec.startedAt) / 1000;
        if (label) label.textContent = formatDuration(elapsed);
      }
      if (activeRecordings.size === 0) {
        if (recorderTimer !== null) clearInterval(recorderTimer);
        recorderTimer = null;
      }
    }, 250);
  };

  const start = (id: string, onResult: (result: RecordedAudio) => void): void => {
    if (activeRecordings.has(id) || startingRecordings.has(id)) return;
    startingRecordings.add(id);
    startRecordingFn()
      .then((controller) => {
        activeRecordings.set(id, { controller, startedAt: Date.now(), onResult });
        startingRecordings.delete(id);
        ensureTimer();
        options.onStarted?.(id);
      })
      .catch((e) => {
        startingRecordings.delete(id);
        options.onError?.(id, e);
      });
  };

  const stop = (id: string): void => {
    const rec = activeRecordings.get(id);
    if (!rec) return;
    activeRecordings.delete(id);
    rec.controller.stop()
      .then((result) => rec.onResult(result))
      .catch((e) => options.onError?.(id, e));
  };

  return {
    isRecording: (id) => activeRecordings.has(id),
    isStarting: (id) => startingRecordings.has(id),
    getActive: (id) => {
      const rec = activeRecordings.get(id);
      return rec ? { controller: rec.controller, startedAt: rec.startedAt } : undefined;
    },
    start,
    stop
  };
}

export function renderRecordingControl(recorder: InlineRecorder, id: string, onResult: (result: RecordedAudio) => void): HTMLElement {
  const recording = recorder.isRecording(id);
  const btn = el("button", {
    class: `card__action-btn${recording ? " card__action-btn--recording" : ""}`,
    type: "button",
    "aria-label": recording ? t("audio.parar") : t("card.adicionarAudio"),
    title: recording ? t("audio.parar") : t("card.adicionarAudio")
  }, [icon(recording ? "stop" : "mic")]);
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (recorder.isRecording(id)) recorder.stop(id);
    else recorder.start(id, onResult);
  });
  return btn;
}

export function renderRecorderTimer(recording: ActiveRecording): HTMLElement {
  return el("span", { class: "card__recorder-timer", role: "timer", "aria-label": t("audio.gravando") }, [
    el("span", { class: "card__recorder-dot", "aria-hidden": "true" }),
    formatDuration((Date.now() - recording.startedAt) / 1000)
  ]);
}
