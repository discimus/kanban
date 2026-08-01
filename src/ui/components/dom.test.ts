import { describe, it, expect, vi, afterEach } from "vitest";
import { flashCard, flashItem } from "./dom";

// ---------------------------------------------------------------------------
// dom.ts depends on DOM APIs only at call time. We stub document.querySelector
// and use fake timers to exercise flashCard/flashItem add/remove cycles.
// ---------------------------------------------------------------------------

function makeFakeElement() {
  const classes = new Set<string>();
  return {
    classList: {
      add: (cls: string) => classes.add(cls),
      remove: (cls: string) => classes.delete(cls),
      contains: (cls: string) => classes.has(cls),
      _classes: classes,
    },
  } as unknown as HTMLElement & { classList: { _classes: Set<string> } };
}

describe("flashCard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("adds card--just-moved to the matching card", () => {
    const card = makeFakeElement();
    vi.stubGlobal("document", { querySelector: () => card });

    flashCard("item-1");
    expect(card.classList.contains("card--just-moved")).toBe(true);
  });

  it("removes card--just-moved after the duration", () => {
    vi.useFakeTimers();
    const card = makeFakeElement();
    vi.stubGlobal("document", { querySelector: () => card });

    flashCard("item-1", 500);
    expect(card.classList.contains("card--just-moved")).toBe(true);

    vi.advanceTimersByTime(499);
    expect(card.classList.contains("card--just-moved")).toBe(true);

    vi.advanceTimersByTime(1);
    expect(card.classList.contains("card--just-moved")).toBe(false);
  });

  it("is a no-op when no card matches", () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { querySelector: () => null });

    expect(() => flashCard("missing-id")).not.toThrow();
    vi.advanceTimersByTime(500);
  });
});

describe("flashItem", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("adds item--flash to the matching row", () => {
    const row = makeFakeElement();
    vi.stubGlobal("document", { querySelector: () => row });

    flashItem("link-1");
    expect(row.classList.contains("item--flash")).toBe(true);
  });

  it("removes item--flash after the duration", () => {
    vi.useFakeTimers();
    const row = makeFakeElement();
    vi.stubGlobal("document", { querySelector: () => row });

    flashItem("task-1", 1200);
    expect(row.classList.contains("item--flash")).toBe(true);

    vi.advanceTimersByTime(1199);
    expect(row.classList.contains("item--flash")).toBe(true);

    vi.advanceTimersByTime(1);
    expect(row.classList.contains("item--flash")).toBe(false);
  });

  it("is a no-op when no row matches", () => {
    vi.useFakeTimers();
    vi.stubGlobal("document", { querySelector: () => null });

    expect(() => flashItem("missing-id")).not.toThrow();
    vi.advanceTimersByTime(1200);
  });
});
