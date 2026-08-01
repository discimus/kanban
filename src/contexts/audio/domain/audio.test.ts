import { describe, it, expect } from "vitest";
import { createAudio, MAX_AUDIO_SIZE, MAX_AUDIO_DURATION } from "@contexts/audio/domain/audio";

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    backlogItemId: "b1",
    dataUrl: "data:audio/webm;base64,GkXfo0",
    filename: "audio.webm",
    mimeType: "audio/webm",
    fileSize: 2048,
    duration: 12,
    ...overrides
  };
}

describe("createAudio", () => {
  it("returns an AudioRecording with generated id", () => {
    const audio = createAudio(makeProps());
    expect(audio.id).toBeTypeOf("string");
    expect(audio.id.length).toBeGreaterThan(0);
  });

  it("returns createdAt as ISO string", () => {
    const audio = createAudio(makeProps());
    expect(audio.createdAt).toBeTypeOf("string");
    expect(() => new Date(audio.createdAt)).not.toThrow();
  });

  it("stores dataUrl correctly", () => {
    const audio = createAudio(makeProps({ dataUrl: "data:audio/mp4;base64,AAAA" }));
    expect(audio.dataUrl).toBe("data:audio/mp4;base64,AAAA");
  });

  it("stores mimeType correctly", () => {
    const audio = createAudio(makeProps({ mimeType: "audio/ogg" }));
    expect(audio.mimeType).toBe("audio/ogg");
  });

  it("stores fileSize correctly", () => {
    const audio = createAudio(makeProps({ fileSize: 4096 }));
    expect(audio.fileSize).toBe(4096);
  });

  it("stores duration rounded to one decimal", () => {
    const audio = createAudio(makeProps({ duration: 12.34 }));
    expect(audio.duration).toBe(12.3);
  });

  it("stores backlogItemId correctly", () => {
    const audio = createAudio(makeProps({ backlogItemId: "b-42" }));
    expect(audio.backlogItemId).toBe("b-42");
  });

  it("throws Error when backlogItemId is empty", () => {
    expect(() => createAudio(makeProps({ backlogItemId: "" }))).toThrow(Error);
  });

  it("throws Error when dataUrl is empty", () => {
    expect(() => createAudio(makeProps({ dataUrl: "" }))).toThrow(Error);
  });

  it("throws Error when filename is empty", () => {
    expect(() => createAudio(makeProps({ filename: "" }))).toThrow(Error);
  });

  it("throws Error when filename is only whitespace", () => {
    expect(() => createAudio(makeProps({ filename: "   " }))).toThrow(Error);
  });

  it("throws Error when mimeType is not an audio", () => {
    expect(() => createAudio(makeProps({ mimeType: "application/pdf" }))).toThrow(Error);
  });

  it("throws Error when mimeType is empty", () => {
    expect(() => createAudio(makeProps({ mimeType: "" }))).toThrow(Error);
  });

  it("throws Error when fileSize exceeds the limit", () => {
    expect(() => createAudio(makeProps({ fileSize: MAX_AUDIO_SIZE + 1 }))).toThrow(Error);
  });

  it("accepts fileSize of exactly the limit", () => {
    const audio = createAudio(makeProps({ fileSize: MAX_AUDIO_SIZE }));
    expect(audio.fileSize).toBe(MAX_AUDIO_SIZE);
  });

  it("throws Error when duration exceeds the limit", () => {
    expect(() => createAudio(makeProps({ duration: MAX_AUDIO_DURATION + 1 }))).toThrow(Error);
  });

  it("throws Error when duration is zero or negative", () => {
    expect(() => createAudio(makeProps({ duration: 0 }))).toThrow(Error);
    expect(() => createAudio(makeProps({ duration: -3 }))).toThrow(Error);
  });

  it("throws Error when duration is not a finite number", () => {
    expect(() => createAudio(makeProps({ duration: NaN }))).toThrow(Error);
  });

  it("trims whitespace from filename", () => {
    const audio = createAudio(makeProps({ filename: "  nota.webm  " }));
    expect(audio.filename).toBe("nota.webm");
  });
});
