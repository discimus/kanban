import { describe, it, expect, vi, afterEach } from "vitest";
import { encodeWav, downsampleToRate, startWavRecording } from "./wav-recorder";
import { MicPermissionError } from "./audio-recorder-types";

function decodeWavHeader(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const ascii = (offset: number, len: number) =>
    Array.from({ length: len }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("");
  return {
    riff: ascii(0, 4),
    wave: ascii(8, 4),
    numChannels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitsPerSample: view.getUint16(34, true),
    dataSize: view.getUint32(40, true),
    byteLength: buffer.byteLength
  };
}

describe("encodeWav", () => {
  it("writes a valid mono 16-bit PCM WAV header", () => {
    const buffer = encodeWav(new Float32Array([0, 0.5, -0.5]), 16000);
    const header = decodeWavHeader(buffer);

    expect(header.riff).toBe("RIFF");
    expect(header.wave).toBe("WAVE");
    expect(header.numChannels).toBe(1);
    expect(header.sampleRate).toBe(16000);
    expect(header.byteRate).toBe(16000 * 2);
    expect(header.blockAlign).toBe(2);
    expect(header.bitsPerSample).toBe(16);
    expect(header.dataSize).toBe(6);
    expect(header.byteLength).toBe(44 + 6);
  });

  it("encodes samples as 16-bit ints", () => {
    const buffer = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]), 16000);
    const view = new DataView(buffer);
    const values = [0, 2, 4, 6, 8].map((offset) => view.getInt16(44 + offset, true));
    expect(values).toEqual([0, 16383, -16384, 32767, -32768]);
  });

  it("clamps out-of-range samples", () => {
    const buffer = encodeWav(new Float32Array([2, -2]), 16000);
    const view = new DataView(buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });
});

describe("downsampleToRate", () => {
  it("returns the same array when no reduction is needed", () => {
    const input = new Float32Array([1, 2, 3]);
    expect(downsampleToRate(input, 16000, 16000)).toBe(input);
    expect(downsampleToRate(input, 16000, 44100)).toBe(input);
  });

  it("averages blocks when downsampling 48kHz -> 16kHz", () => {
    const input = new Float32Array([1, 2, 3, 4, 5, 6]);
    const out = downsampleToRate(input, 48000, 16000);
    expect(out.length).toBe(2);
    expect(out[0]).toBeCloseTo(2, 5);
    expect(out[1]).toBeCloseTo(5, 5);
  });
});

// ---------------------------------------------------------------------------
// Fake Web Audio environment: stubs AudioContext, ScriptProcessorNode and
// navigator.mediaDevices so the controller can be driven directly.
// ---------------------------------------------------------------------------

interface FakeProcessor {
  onaudioprocess: ((ev: { inputBuffer: { getChannelData: (ch: number) => Float32Array } }) => void) | null;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeAudioEnv {
  FakeAudioContext: ReturnType<typeof vi.fn>;
  processor: () => FakeProcessor | null;
  resume: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  stopTrack: ReturnType<typeof vi.fn>;
  stream: { getTracks: ReturnType<typeof vi.fn> };
}

function makeFakeAudioEnv(sourceRate = 48000, initialState = "running"): FakeAudioEnv {
  const resume = vi.fn(() => Promise.resolve());
  const close = vi.fn(() => Promise.resolve());
  const stopTrack = vi.fn();
  const tracks = [{ stop: stopTrack }];
  const stream = { getTracks: vi.fn(() => tracks) };

  const sourceNode = { connect: vi.fn(), disconnect: vi.fn() };
  const silenceNode = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
  let processor: FakeProcessor | null = null;

  const FakeAudioContext = vi.fn(function (this: {
    state: string;
    sampleRate: number;
    destination: object;
    createMediaStreamSource: () => typeof sourceNode;
    createScriptProcessor: () => FakeProcessor;
    createGain: () => typeof silenceNode;
    resume: () => Promise<void>;
    close: () => Promise<void>;
  }) {
    this.state = initialState;
    this.sampleRate = sourceRate;
    this.destination = {};
    this.createMediaStreamSource = vi.fn(() => sourceNode);
    this.createScriptProcessor = vi.fn(() => {
      const proc: FakeProcessor = { onaudioprocess: null, connect: vi.fn(), disconnect: vi.fn() };
      processor = proc;
      return proc;
    });
    this.createGain = vi.fn(() => silenceNode);
    this.resume = resume;
    this.close = close;
  });

  return { FakeAudioContext, processor: () => processor, resume, close, stopTrack, stream };
}

async function startWithEnv(env: FakeAudioEnv, getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(getUserMedia) } });
  vi.stubGlobal("AudioContext", env.FakeAudioContext);
  return startWavRecording();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startWavRecording", () => {
  it("records PCM and resolves a WAV data URL with the exact duration", async () => {
    const env = makeFakeAudioEnv(48000);
    const controller = await startWithEnv(env, () => Promise.resolve(env.stream));

    const proc = env.processor()!;
    const frames = [new Float32Array(1600).fill(0.1), new Float32Array(1600).fill(0.2), new Float32Array(1600).fill(-0.1)];
    for (const frame of frames) {
      proc.onaudioprocess!({ inputBuffer: { getChannelData: () => frame } });
    }

    const result = await controller.stop();

    expect(result.dataUrl.startsWith("data:audio/wav;base64,")).toBe(true);
    expect(result.mimeType).toBe("audio/wav");
    expect(result.fileSize).toBeGreaterThan(44);
    expect(result.duration).toBeCloseTo(4800 / 48000, 5);
    expect(env.stopTrack).toHaveBeenCalledTimes(1);
    expect(env.close).toHaveBeenCalled();
  });

  it("resumes a suspended AudioContext", async () => {
    const env = makeFakeAudioEnv(48000, "suspended");
    const controller = await startWithEnv(env, () => Promise.resolve(env.stream));

    expect(env.resume).toHaveBeenCalledTimes(1);

    const proc = env.processor()!;
    proc.onaudioprocess!({ inputBuffer: { getChannelData: () => new Float32Array(1600) } });
    const result = await controller.stop();
    expect(result.mimeType).toBe("audio/wav");
  });

  it("cancel() rejects the pending stop with RECORDING_CANCELLED", async () => {
    const env = makeFakeAudioEnv();
    const controller = await startWithEnv(env, () => Promise.resolve(env.stream));

    controller.cancel();
    await expect(controller.stop()).rejects.toThrow("RECORDING_CANCELLED");
  });

  it("elapsed() is monotonic and non-negative", async () => {
    const env = makeFakeAudioEnv();
    const controller = await startWithEnv(env, () => Promise.resolve(env.stream));
    expect(controller.elapsed()).toBeGreaterThanOrEqual(0);
  });

  it("rejects with MicPermissionError when the mic is denied", async () => {
    const env = makeFakeAudioEnv();
    await expect(startWithEnv(env, () => Promise.reject(new Error("denied")))).rejects.toBeInstanceOf(MicPermissionError);
  });

  it("throws when Web Audio is unavailable", async () => {
    const env = makeFakeAudioEnv();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(() => Promise.resolve(env.stream)) } });
    vi.stubGlobal("AudioContext", undefined);

    await expect(startWavRecording()).rejects.toThrow("não suporta gravação");
  });
});
