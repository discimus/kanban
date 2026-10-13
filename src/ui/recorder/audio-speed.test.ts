import { describe, it, expect } from "vitest";
import { PLAYBACK_RATES, nextPlaybackRate, formatPlaybackRate } from "./audio-speed";

describe("nextPlaybackRate", () => {
  it("cycles 1 -> 1.5 -> 2 -> 1", () => {
    expect(nextPlaybackRate(1)).toBe(1.5);
    expect(nextPlaybackRate(1.5)).toBe(2);
    expect(nextPlaybackRate(2)).toBe(1);
  });

  it("falls back to the first rate for unknown values", () => {
    expect(nextPlaybackRate(0)).toBe(1);
    expect(nextPlaybackRate(3)).toBe(1);
    expect(nextPlaybackRate(NaN)).toBe(1);
  });

  it("exposes the canonical rate list", () => {
    expect([...PLAYBACK_RATES]).toEqual([1, 1.5, 2]);
  });
});

describe("formatPlaybackRate", () => {
  it("uses a comma decimal separator in pt-BR", () => {
    expect(formatPlaybackRate(1.5, "pt-BR")).toBe("1,5\u00d7");
  });

  it("uses a dot decimal separator in en-US", () => {
    expect(formatPlaybackRate(1.5, "en-US")).toBe("1.5\u00d7");
  });

  it("formats whole-number speeds without decimals", () => {
    expect(formatPlaybackRate(1, "pt-BR")).toBe("1\u00d7");
    expect(formatPlaybackRate(2, "en-US")).toBe("2\u00d7");
  });
});
