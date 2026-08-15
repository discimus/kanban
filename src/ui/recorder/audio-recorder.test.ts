import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startRecording, pickSupportedMimeTypes, MicPermissionError, extensionForMimeType, SUPPORTED_MIMES } from "./audio-recorder";

/** Minimal MediaRecorder fake: EventTarget + isTypeSupported + mimeType. */
class FakeMediaRecorder extends EventTarget {
  static isSupported: (mimeType: string) => boolean = () => true;
  static constructThrows: (mimeType: string) => boolean = () => false;
  static startThrows: (mimeType: string) => boolean = () => false;
  static dataSize = 1024;
  static startTimeslices: number[] = [];

  state: "inactive" | "recording" | "paused" = "inactive";
  mimeType: string;
  stream: unknown;

  constructor(stream: unknown, options?: MediaRecorderOptions) {
    super();
    const mimeType = options?.mimeType ?? "audio/webm";
    if (FakeMediaRecorder.constructThrows(mimeType)) throw new DOMException("", "NotSupportedError");
    this.stream = stream;
    this.mimeType = mimeType;
  }

  static isTypeSupported(mimeType: string): boolean {
    return FakeMediaRecorder.isSupported(mimeType);
  }

  start(timeslice?: number): void {
    FakeMediaRecorder.startTimeslices.push(timeslice ?? 0);
    if (FakeMediaRecorder.startThrows(this.mimeType)) throw new DOMException("", "NotSupportedError");
    this.state = "recording";
  }

  stop(): void {
    this.state = "inactive";
    const payload = new ArrayBuffer(FakeMediaRecorder.dataSize);
    const dataEv = new Event("dataavailable") as Event & { data: Blob };
    dataEv.data = new Blob([payload], { type: this.mimeType });
    this.dispatchEvent(dataEv);
    this.dispatchEvent(new Event("stop"));
  }
}

function makeStream(): { getTracks: ReturnType<typeof vi.fn>; tracks: { stop: ReturnType<typeof vi.fn> }[] } {
  const tracks = [{ stop: vi.fn() }];
  return { getTracks: vi.fn(() => tracks), tracks };
}

function stubFileReader(dataUrl: string): void {
  class FakeFileReader {
    result: string = dataUrl;
    private listeners: Record<string, Array<() => void>> = {};
    addEventListener(type: string, cb: () => void): void {
      (this.listeners[type] ??= []).push(cb);
    }
    readAsDataURL(): void {
      for (const cb of this.listeners.load ?? []) cb();
    }
  }
  vi.stubGlobal("FileReader", FakeFileReader);
}

function stubEnvironment(stream: { getTracks: ReturnType<typeof vi.fn> }): void {
  const getUserMedia = vi.fn(async () => stream);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
}

beforeEach(() => {
  FakeMediaRecorder.isSupported = () => true;
  FakeMediaRecorder.constructThrows = () => false;
  FakeMediaRecorder.startThrows = () => false;
  FakeMediaRecorder.dataSize = 1024;
  FakeMediaRecorder.startTimeslices = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pickSupportedMimeTypes", () => {
  it("returns supported candidates in priority order", () => {
    const isSupported = (m: string) => m === "audio/webm;codecs=opus" || m === "audio/mp4";
    expect(pickSupportedMimeTypes(isSupported)).toEqual(["audio/webm;codecs=opus", "audio/mp4"]);
  });

  it("returns an empty list when nothing is supported", () => {
    expect(pickSupportedMimeTypes(() => false)).toEqual([]);
  });

  it("treats a throwing isTypeSupported as unsupported", () => {
    expect(pickSupportedMimeTypes(() => { throw new Error("boom"); })).toEqual([]);
  });

  it("prefers webm/opus and keeps mp4 as a fallback", () => {
    expect(SUPPORTED_MIMES[0]).toBe("audio/webm;codecs=opus");
    expect(SUPPORTED_MIMES).toContain("audio/mp4");
  });
});

describe("extensionForMimeType", () => {
  it("maps mp4/ogg/webm mime types to extensions", () => {
    expect(extensionForMimeType("audio/mp4")).toBe("mp4");
    expect(extensionForMimeType("audio/ogg")).toBe("ogg");
    expect(extensionForMimeType("audio/webm;codecs=opus")).toBe("webm");
  });
});

describe("startRecording", () => {
  it("resolves a controller and stops into a RecordedAudio", async () => {
    const stream = makeStream();
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);
    stubFileReader("data:audio/webm;base64,AAAA");

    const controller = await startRecording();
    const result = await controller.stop();

    expect(controller.elapsed()).toBeGreaterThanOrEqual(0);
    expect(result.dataUrl).toBe("data:audio/webm;base64,AAAA");
    expect(result.mimeType).toBe("audio/webm;codecs=opus");
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
    expect(stream.tracks[0].stop).toHaveBeenCalled();
  });

  it("starts with a timeslice (WebKit dataavailable workaround)", async () => {
    const stream = makeStream();
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);

    await startRecording();

    expect(FakeMediaRecorder.startTimeslices).toContain(250);
  });

  it("falls back to mp4 when webm start() throws (iOS quirk)", async () => {
    const stream = makeStream();
    FakeMediaRecorder.startThrows = (m) => m.includes("webm");
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);
    stubFileReader("data:audio/mp4;base64,AAAA");

    const controller = await startRecording();
    const result = await controller.stop();

    expect(result.mimeType).toBe("audio/mp4");
  });

  it("constructs without a mimeType when no candidate is supported", async () => {
    const stream = makeStream();
    FakeMediaRecorder.isSupported = () => false;
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);
    stubFileReader("data:audio/webm;base64,AAAA");

    const controller = await startRecording();
    const result = await controller.stop();

    expect(result.mimeType).toBe("audio/webm");
  });

  it("rejects and stops tracks when every candidate fails", async () => {
    const stream = makeStream();
    FakeMediaRecorder.constructThrows = () => true;
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);

    await expect(startRecording()).rejects.toThrow("Erro ao gravar áudio.");
    expect(stream.tracks[0].stop).toHaveBeenCalled();
  });

  it("rejects an empty recording instead of saving it", async () => {
    const stream = makeStream();
    FakeMediaRecorder.dataSize = 0;
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);

    const controller = await startRecording();
    await expect(controller.stop()).rejects.toThrow("Erro ao gravar áudio.");
  });

  it("rejects with MicPermissionError when the mic is denied", async () => {
    const getUserMedia = vi.fn(async () => { throw new Error("denied"); });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(startRecording()).rejects.toBeInstanceOf(MicPermissionError);
  });

  it("throws when MediaRecorder is unavailable", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });

    await expect(startRecording()).rejects.toThrow("não suporta gravação");
  });

  it("cancel() rejects the pending stop", async () => {
    const stream = makeStream();
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    stubEnvironment(stream);

    const controller = await startRecording();
    controller.cancel();

    await expect(controller.stop()).rejects.toThrow("RECORDING_CANCELLED");
  });
});
