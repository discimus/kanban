import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MicPermissionError } from "./audio-recorder";

// ---------------------------------------------------------------------------
// Facade routing: startRecording must pick the WAV engine on iOS and the
// MediaRecorder engine elsewhere, falling back when WAV fails for a
// non-permission reason. The engines are mocked so we can assert routing.
// ---------------------------------------------------------------------------

const { mocks } = vi.hoisted(() => {
  const isAppleIOS = vi.fn(() => false);
  const startWavRecording = vi.fn(async () => ({
    elapsed: () => 0,
    stop: async () => ({ dataUrl: "data:audio/wav;base64,QQ==", mimeType: "audio/wav", fileSize: 44, duration: 1 }),
    cancel: () => {}
  }));
  return { mocks: { isAppleIOS, startWavRecording } };
});

vi.mock("./platform", () => ({ isAppleIOS: mocks.isAppleIOS }));
vi.mock("./wav-recorder", () => ({ startWavRecording: mocks.startWavRecording }));

import { startRecording } from "./audio-recorder";

class FakeMediaRecorder extends EventTarget {
  static isTypeSupported(): boolean {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  constructor(_stream: unknown, options?: MediaRecorderOptions) {
    super();
    if (options?.mimeType) this.mimeType = options.mimeType;
  }
  start(): void {
    this.state = "recording";
  }
}

function stubMediaEnvironment() {
  const tracks = [{ stop: vi.fn() }];
  const stream = { getTracks: vi.fn(() => tracks) };
  const getUserMedia = vi.fn(async () => stream);
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  return { getUserMedia, tracks };
}

beforeEach(() => {
  mocks.isAppleIOS.mockReset().mockReturnValue(false);
  mocks.startWavRecording.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startRecording routing", () => {
  it("routes to the WAV recorder on iOS", async () => {
    const { getUserMedia } = stubMediaEnvironment();
    mocks.isAppleIOS.mockReturnValue(true);

    await startRecording();

    expect(mocks.startWavRecording).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("routes to MediaRecorder off iOS", async () => {
    const { getUserMedia } = stubMediaEnvironment();

    await startRecording();

    expect(mocks.startWavRecording).not.toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("falls back to MediaRecorder when WAV fails for a non-permission reason", async () => {
    const { getUserMedia } = stubMediaEnvironment();
    mocks.isAppleIOS.mockReturnValue(true);
    mocks.startWavRecording.mockRejectedValueOnce(new Error("boom"));

    await startRecording();

    expect(mocks.startWavRecording).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("does not fall back when mic permission was denied on iOS", async () => {
    const { getUserMedia } = stubMediaEnvironment();
    mocks.isAppleIOS.mockReturnValue(true);
    mocks.startWavRecording.mockRejectedValueOnce(new MicPermissionError("denied"));

    await expect(startRecording()).rejects.toBeInstanceOf(MicPermissionError);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
