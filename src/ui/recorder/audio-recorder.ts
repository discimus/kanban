import { MicPermissionError, type AudioRecorderController, type RecordedAudio } from "./audio-recorder-types";
import { startWavRecording } from "./wav-recorder";
import { isAppleIOS } from "./platform";

export { MicPermissionError };
export type { AudioRecorderController, RecordedAudio };

/**
 * Recording candidates in priority order.
 *
 * `audio/webm;codecs=opus` is preferred: it is the only format guaranteed to
 * round-trip through both MediaRecorder and the `<audio>` element on every
 * current browser, and it sidesteps the iOS 26 `audio/mp4` MediaRecorder
 * regressions (WebKit bugs 299164/315091). `audio/mp4` (AAC) is the fallback
 * for Safari/iOS <= 18.3, where WebM recording is unavailable.
 */
export const SUPPORTED_MIMES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];

/** Timeslice passed to `MediaRecorder.start()`. WebKit/Safari historically
 *  failed to deliver a valid `dataavailable` blob without it. */
const TIMESLICE_MS = 250;

/** Returns the supported candidates, in priority order. `isTypeSupported`
 *  can throw on exotic implementations, so every call is guarded. */
export function pickSupportedMimeTypes(isTypeSupported: (mimeType: string) => boolean): string[] {
  return SUPPORTED_MIMES.filter((mimeType) => {
    try {
      return isTypeSupported(mimeType);
    } catch {
      return false;
    }
  });
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Requests the microphone and starts an audio recording, choosing the engine
 * per platform:
 * - iOS Safari: Web Audio PCM -> WAV (see wav-recorder.ts). The MediaRecorder
 *   `audio/mp4` encoder is unreliable there (multiple WebKit regressions), so
 *   it is avoided. If the WAV capture fails for a non-permission reason, we
 *   fall back to MediaRecorder rather than giving up.
 * - Everywhere else: MediaRecorder with the browser's best supported codec.
 *
 * Resolves with a controller once the mic is granted and the recorder is
 * running; rejects with {@link MicPermissionError} when access is denied.
 */
export async function startRecording(): Promise<AudioRecorderController> {
  if (isAppleIOS()) {
    try {
      return await startWavRecording();
    } catch (error) {
      if (error instanceof MicPermissionError) throw error;
      // WAV capture unavailable (e.g. no AudioContext) — fall through to MediaRecorder.
    }
  }
  return startMediaRecorderRecording();
}

/**
 * MediaRecorder-based engine. iOS quirk handled here:
 * `MediaRecorder.isTypeSupported()` can report a type as supported while
 * `start()` still throws `NotSupportedError`. Every candidate is therefore
 * tried defensively, falling back to the next one and finally to the browser
 * default (no mimeType) before giving up.
 */
async function startMediaRecorderRecording(): Promise<AudioRecorderController> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Seu navegador não suporta gravação de áudio.");
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicPermissionError("Permissão de microfone negada.");
  }

  const candidates = [
    ...pickSupportedMimeTypes((mimeType) => MediaRecorder.isTypeSupported(mimeType)),
    "" // empty string => construct without mimeType, let the browser choose
  ];

  let recorder: MediaRecorder | null = null;
  for (const mimeType of candidates) {
    try {
      const attempt = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      if (attempt.state === "inactive") attempt.start(TIMESLICE_MS);
      recorder = attempt;
      break;
    } catch {
      recorder = null;
    }
  }

  if (!recorder) {
    stream.getTracks().forEach((tr) => tr.stop());
    throw new Error("Erro ao gravar áudio.");
  }

  // The browser may normalize what we asked for; the value it reports is the
  // one that actually describes the recorded blob.
  const mimeType = recorder.mimeType || "";
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();
  let cancelled = false;
  let finished = false;

  const done = new Promise<RecordedAudio>((resolve, reject) => {
    recorder!.addEventListener("dataavailable", (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    });

    recorder!.addEventListener("stop", () => {
      if (finished) return;
      finished = true;
      stream.getTracks().forEach((tr) => tr.stop());
      if (cancelled) {
        reject(new Error("RECORDING_CANCELLED"));
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error("Erro ao gravar áudio."));
        return;
      }
      const fileSize = blob.size;
      const duration = (Date.now() - startedAt) / 1000;
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve({
        dataUrl: reader.result as string,
        mimeType: blob.type || mimeType || "audio/webm",
        fileSize,
        duration
      }));
      reader.addEventListener("error", () => reject(new Error("Erro ao gravar áudio.")));
      reader.readAsDataURL(blob);
    });

    recorder!.addEventListener("error", () => {
      if (finished) return;
      finished = true;
      stream.getTracks().forEach((tr) => tr.stop());
      reject(new Error("Erro ao gravar áudio."));
    });
  });

  return {
    elapsed: () => (Date.now() - startedAt) / 1000,
    stop: () => {
      if (recorder!.state !== "inactive") recorder!.stop();
      return done;
    },
    cancel: () => {
      if (finished) return;
      cancelled = true;
      if (recorder!.state !== "inactive") recorder!.stop();
    }
  };
}
