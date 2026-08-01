export interface RecordedAudio {
  dataUrl: string;
  mimeType: string;
  fileSize: number;
  duration: number;
}

export interface AudioRecorderController {
  elapsed(): number;
  stop(): Promise<RecordedAudio>;
  cancel(): void;
}

export class MicPermissionError extends Error {}

const SUPPORTED_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return SUPPORTED_MIMES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/**
 * Requests the microphone and starts an audio recording.
 * Resolves with a controller once the mic is granted and the recorder is
 * running; rejects with {@link MicPermissionError} when access is denied.
 */
export async function startRecording(): Promise<AudioRecorderController> {
  const mimeType = pickSupportedMimeType();
  if (!mimeType) throw new Error("Seu navegador não suporta gravação de áudio.");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicPermissionError("Permissão de microfone negada.");
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();
  let cancelled = false;
  let finished = false;

  const done = new Promise<RecordedAudio>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    });

    recorder.addEventListener("stop", () => {
      if (finished) return;
      finished = true;
      stream.getTracks().forEach((tr) => tr.stop());
      if (cancelled) {
        reject(new Error("RECORDING_CANCELLED"));
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      const fileSize = blob.size;
      const duration = (Date.now() - startedAt) / 1000;
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve({
        dataUrl: reader.result as string,
        mimeType: blob.type || "audio/webm",
        fileSize,
        duration
      }));
      reader.readAsDataURL(blob);
    });

    recorder.addEventListener("error", () => {
      if (finished) return;
      finished = true;
      stream.getTracks().forEach((tr) => tr.stop());
      reject(new Error("Erro ao gravar áudio."));
    });
  });

  recorder.start();

  return {
    elapsed: () => (Date.now() - startedAt) / 1000,
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    },
    cancel: () => {
      if (finished) return;
      cancelled = true;
      if (recorder.state !== "inactive") recorder.stop();
    }
  };
}
