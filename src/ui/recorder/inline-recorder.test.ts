import { describe, it, expect, vi, afterEach } from "vitest";
import { createInlineRecorder, formatDuration } from "@ui/recorder/inline-recorder";
import type { AudioRecorderController, RecordedAudio } from "@ui/recorder/audio-recorder";

interface FakeController {
  controller: AudioRecorderController;
  stop: ReturnType<typeof vi.fn>;
  finish: (result: RecordedAudio) => void;
}

function makeController(): FakeController {
  let finish: (result: RecordedAudio) => void = () => {};
  const stop = vi.fn(() => new Promise<RecordedAudio>((resolve) => {
    finish = resolve;
  }));
  return {
    controller: { elapsed: () => 0, stop, cancel: () => {} },
    stop,
    finish: (result) => finish(result)
  };
}

const AUDIO_RESULT: RecordedAudio = {
  dataUrl: "data:audio/webm;base64,xx",
  mimeType: "audio/webm",
  fileSize: 10,
  duration: 1.5
};

afterEach(() => {
  vi.useRealTimers();
});

describe("createInlineRecorder", () => {
  it("registers a recording after start resolves and calls onStarted", async () => {
    const onStarted = vi.fn();
    const fake = makeController();
    const rec = createInlineRecorder({
      startRecordingFn: () => Promise.resolve(fake.controller),
      onStarted,
      getTimerEl: () => null
    });

    rec.start("a1", vi.fn());
    await vi.waitFor(() => expect(rec.isRecording("a1")).toBe(true));
    expect(onStarted).toHaveBeenCalledWith("a1");
    expect(rec.isStarting("a1")).toBe(false);
  });

  it("isRecording returns false after stop", async () => {
    const fake = makeController();
    const rec = createInlineRecorder({ startRecordingFn: () => Promise.resolve(fake.controller), getTimerEl: () => null });

    rec.start("a1", vi.fn());
    await vi.waitFor(() => expect(rec.isRecording("a1")).toBe(true));
    rec.stop("a1");
    expect(rec.isRecording("a1")).toBe(false);
  });

  it("ignores duplicate starts while a recording is active", async () => {
    const startRecordingFn = vi.fn(() => Promise.resolve(makeController().controller));
    const rec = createInlineRecorder({ startRecordingFn, getTimerEl: () => null });

    rec.start("a1", vi.fn());
    await vi.waitFor(() => expect(rec.isRecording("a1")).toBe(true));
    rec.start("a1", vi.fn());
    expect(startRecordingFn).toHaveBeenCalledTimes(1);
  });

  it("ignores a second start while one is pending", () => {
    const startRecordingFn = vi.fn(() => new Promise<AudioRecorderController>(() => {}));
    const rec = createInlineRecorder({ startRecordingFn, getTimerEl: () => null });

    rec.start("a1", vi.fn());
    rec.start("a1", vi.fn());
    expect(startRecordingFn).toHaveBeenCalledTimes(1);
  });

  it("calls onError and does not register when start fails", async () => {
    const onError = vi.fn();
    const error = new Error("mic denied");
    const rec = createInlineRecorder({
      startRecordingFn: () => Promise.reject(error),
      onError,
      getTimerEl: () => null
    });

    rec.start("a1", vi.fn());
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("a1", error));
    expect(rec.isRecording("a1")).toBe(false);
    expect(rec.isStarting("a1")).toBe(false);
  });

  it("stops the controller and resolves onResult with the audio", async () => {
    const onResult = vi.fn();
    const fake = makeController();
    const rec = createInlineRecorder({ startRecordingFn: () => Promise.resolve(fake.controller), getTimerEl: () => null });

    rec.start("a1", onResult);
    await vi.waitFor(() => expect(rec.isRecording("a1")).toBe(true));
    rec.stop("a1");
    fake.finish(AUDIO_RESULT);
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(AUDIO_RESULT));
    expect(fake.stop).toHaveBeenCalledTimes(1);
  });

  it("stop without an active recording is a no-op", () => {
    const rec = createInlineRecorder({ getTimerEl: () => null });
    expect(() => rec.stop("ghost")).not.toThrow();
  });

  it("auto-stops when elapsed exceeds maxDuration and saves via onResult", async () => {
    vi.useFakeTimers();
    const fake = makeController();
    const onResult = vi.fn();
    const rec = createInlineRecorder({
      startRecordingFn: () => Promise.resolve(fake.controller),
      maxDuration: 60,
      getTimerEl: () => null
    });

    rec.start("a1", onResult);
    await Promise.resolve();
    expect(rec.isRecording("a1")).toBe(true);

    vi.advanceTimersByTime(61_000);
    await Promise.resolve();
    expect(rec.isRecording("a1")).toBe(false);
    expect(fake.stop).toHaveBeenCalled();

    fake.finish(AUDIO_RESULT);
    await Promise.resolve();
    expect(onResult).toHaveBeenCalledWith(AUDIO_RESULT);
  });

  it("updates the timer label with the formatted elapsed time", async () => {
    vi.useFakeTimers();
    const label = { textContent: "" };
    const fake = makeController();
    const rec = createInlineRecorder({
      startRecordingFn: () => Promise.resolve(fake.controller),
      getTimerEl: () => label as unknown as HTMLElement
    });

    rec.start("a1", vi.fn());
    await Promise.resolve();
    vi.advanceTimersByTime(2_000);
    expect(label.textContent).toBe("00:02");
  });

  it("clears the interval when no recordings remain", async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const fake = makeController();
    const rec = createInlineRecorder({ startRecordingFn: () => Promise.resolve(fake.controller), getTimerEl: () => null });

    rec.start("a1", vi.fn());
    await Promise.resolve();
    rec.stop("a1");
    vi.advanceTimersByTime(250);
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("formatDuration", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3.9)).toBe("00:03");
    expect(formatDuration(-5)).toBe("00:00");
  });
});
