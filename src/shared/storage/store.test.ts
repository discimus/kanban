import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AppState } from "@shared/types";

// ---------------------------------------------------------------------------
// Hoist mocks before any module import so vi.mock works correctly.
// ---------------------------------------------------------------------------
const { mockLocalStorage, mockEventBus } = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    mockLocalStorage: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      _store: store,
      _clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    },
    mockEventBus: {
      emit: vi.fn(),
      on: vi.fn(),
    },
  };
});

vi.mock("@shared/events", () => ({ eventBus: mockEventBus }));

// Provide localStorage global before the Store class runs its constructor.
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Import Store after mocks are in place. We import the class internals via
// a small helper that re-instantiates a fresh Store for each test.
// ---------------------------------------------------------------------------

// We cannot import `store` singleton directly because it was already
// constructed at module load time. Instead we test the behaviour through
// the exported singleton after resetting state, and use fake timers to
// control the debounce window.

import { store } from "@shared/storage";

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  mockLocalStorage._clear();
  mockLocalStorage.setItem.mockClear();
  mockEventBus.emit.mockClear();
  // Reset store to empty state before each test.
  store.reset();
  mockLocalStorage.setItem.mockClear();
  mockEventBus.emit.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Store.update — debounced persist", () => {
  it("emits state:changed synchronously on update", () => {
    store.update((s: AppState) => { s.products = []; });
    expect(mockEventBus.emit).toHaveBeenCalledWith("state:changed");
  });

  it("does NOT persist synchronously when update is called", () => {
    store.update((s: AppState) => { s.products = []; });
    // setItem should NOT have been called yet (debounce pending)
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("persists after the debounce window elapses", () => {
    store.update((s: AppState) => { s.products = []; });
    vi.advanceTimersByTime(300);
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("coalesces multiple rapid updates into a single persist", () => {
    store.update((s: AppState) => { s.products = []; });
    store.update((s: AppState) => { s.products = []; });
    store.update((s: AppState) => { s.products = []; });
    vi.advanceTimersByTime(300);
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("each burst separated by more than 300ms produces a separate persist", () => {
    store.update((s: AppState) => { s.products = []; });
    vi.advanceTimersByTime(300);
    store.update((s: AppState) => { s.products = []; });
    vi.advanceTimersByTime(300);
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
  });

  it("in-memory state is updated synchronously before persist fires", () => {
    store.update((s: AppState) => {
      s.products = [{ id: "p1" } as never];
    });
    // State is already updated even though persist hasn't fired yet.
    expect(store.getState().products).toHaveLength(1);
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });
});

describe("Store.flushPersist", () => {
  it("persists immediately without waiting for the timer", () => {
    store.update((s: AppState) => { s.products = []; });
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    store.flushPersist();
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("calling flushPersist when no pending timer is a no-op", () => {
    store.flushPersist(); // no prior update
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("after flush, the timer no longer fires", () => {
    store.update((s: AppState) => { s.products = []; });
    store.flushPersist();
    mockLocalStorage.setItem.mockClear();
    vi.advanceTimersByTime(300);
    // Timer was cancelled — no second persist.
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });
});

describe("Store.reset — persists synchronously", () => {
  it("persists immediately on reset (no debounce)", () => {
    store.reset();
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
  });
});

describe("Store.replaceState — persists synchronously", () => {
  it("persists immediately on replaceState (no debounce)", () => {
    const newState = store.getState();
    store.replaceState(newState);
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
  });
});
