import { describe, it, expect, vi, afterEach } from "vitest";
import { confettiOrigin, showConfetti } from "@ui/components/confetti";

function makeRect(left: number, top: number, right: number, bottom: number): DOMRect {
  return {
    left,
    top,
    right,
    bottom,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    toJSON: () => ({})
  } as DOMRect;
}

const viewport = { width: 1000, height: 800 };

describe("confettiOrigin", () => {
  it("returns the center of a fully visible card", () => {
    const origin = confettiOrigin(makeRect(100, 100, 300, 200), viewport);
    expect(origin).toEqual({ x: 200, y: 150 });
  });

  it("clamps to the viewport when the card is partially visible", () => {
    const origin = confettiOrigin(makeRect(-100, -50, 200, 150), viewport);
    expect(origin).toEqual({ x: 100, y: 75 });
  });

  it("returns null when the card is fully outside horizontally", () => {
    expect(confettiOrigin(makeRect(1200, 100, 1400, 200), viewport)).toBeNull();
  });

  it("returns null when the card is fully below the viewport", () => {
    expect(confettiOrigin(makeRect(100, 900, 300, 1000), viewport)).toBeNull();
  });

  it("returns null when the card has no visible intersection", () => {
    expect(confettiOrigin(makeRect(1000, 800, 1200, 1000), viewport)).toBeNull();
  });
});

describe("showConfetti", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when the user prefers reduced motion", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(() => showConfetti(10, 10)).not.toThrow();
  });
});
