import { blobToDataUrl } from "@shared/storage/blob-store";
import { AudioRecorderController, MicPermissionError, RecordedAudio } from "./audio-recorder-types";

/**
 * Web Audio PCM capture for iOS Safari, where `MediaRecorder` only supports
 * the `audio/mp4` AAC encoder — which WebKit has repeatedly shipped broken
 * (e.g. iOS 26 regressions that emit corrupt/truncated blobs). Instead of an
 * encoder we capture raw PCM and wrap it in a WAV container, which Safari (and
 * every other browser) decodes natively with no codec involvement.
 *
 * Files are downsampled to 16 kHz mono 16-bit (~1 MB/min) — voice notes stay
 * intelligible while keeping IndexedDB/storage usage small.
 */

export const WAV_SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 2048;

/**
 * Encodes 16-bit PCM samples into a mono WAV (RIFF/WAVE) container.
 * Pure and side-effect free, so it is unit-tested directly.
 */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

/**
 * Anti-aliased downsample by block averaging. Returns the same array when no
 * reduction is needed (target rate >= source rate).
 */
export function downsampleToRate(samples: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  if (sourceRate <= targetRate) return samples;
  const ratio = sourceRate / targetRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += samples[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof AudioContext !== "undefined") return AudioContext;
  const webkit = (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return webkit ?? null;
}

export async function startWavRecording(): Promise<AudioRecorderController> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Seu navegador não suporta gravação de áudio.");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicPermissionError("Permissão de microfone negada.");
  }

  const context = new Ctor();
  if (context.state === "suspended") await context.resume();

  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
  const silence = context.createGain();
  silence.gain.value = 0;

  const chunks: Float32Array[] = [];
  let totalSamples = 0;

  processor.onaudioprocess = (ev: AudioProcessingEvent) => {
    const data = ev.inputBuffer.getChannelData(0).slice();
    chunks.push(data);
    totalSamples += data.length;
  };

  source.connect(processor);
  processor.connect(silence);
  silence.connect(context.destination);

  const startedAt = Date.now();
  let finalized = false;
  let cancelled = false;
  let donePromise: Promise<RecordedAudio> | null = null;

  const cleanup = (): void => {
    source.disconnect();
    processor.disconnect();
    silence.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };

  const finalize = (): Promise<RecordedAudio> => {
    if (!donePromise) {
      donePromise = (async () => {
        if (cancelled) throw new Error("RECORDING_CANCELLED");
        const merged = new Float32Array(totalSamples);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        const wav = downsampleToRate(merged, context.sampleRate, WAV_SAMPLE_RATE);
        const buffer = encodeWav(wav, WAV_SAMPLE_RATE);
        const blob = new Blob([buffer], { type: "audio/wav" });
        return {
          dataUrl: await blobToDataUrl(blob),
          mimeType: "audio/wav",
          fileSize: blob.size,
          duration: wav.length / WAV_SAMPLE_RATE
        };
      })();
    }
    return donePromise;
  };

  return {
    elapsed: () => (Date.now() - startedAt) / 1000,
    stop: () => {
      if (!finalized) {
        finalized = true;
        cleanup();
      }
      return finalize();
    },
    cancel: () => {
      if (!finalized) {
        finalized = true;
        cancelled = true;
        cleanup();
      }
      void finalize().catch(() => { /* no-op */ });
    }
  };
}
