import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLocalStorage } = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    mockLocalStorage: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      _store: store,
      _clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    },
  };
});

beforeEach(() => {
  mockLocalStorage._clear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
  });
});

import { resolveStickyRowMode, getStickyRowMode, setStickyRowMode, toggleStickyRowMode } from "./sticky-row-mode";

describe("resolveStickyRowMode", () => {
  it("returns wrap for null", () => {
    expect(resolveStickyRowMode(null)).toBe("wrap");
  });

  it("returns wrap for invalid values", () => {
    expect(resolveStickyRowMode("grid")).toBe("wrap");
    expect(resolveStickyRowMode("")).toBe("wrap");
  });

  it("returns inline for 'inline'", () => {
    expect(resolveStickyRowMode("inline")).toBe("inline");
  });

  it("returns wrap for 'wrap'", () => {
    expect(resolveStickyRowMode("wrap")).toBe("wrap");
  });
});

describe("getStickyRowMode", () => {
  it("defaults to wrap when nothing is stored", () => {
    expect(getStickyRowMode()).toBe("wrap");
  });

  it("reads inline when stored", () => {
    mockLocalStorage._store["kanban-sticky-row-mode"] = "inline";
    expect(getStickyRowMode()).toBe("inline");
  });
});

describe("setStickyRowMode", () => {
  it("persists the mode", () => {
    setStickyRowMode("inline");
    expect(mockLocalStorage._store["kanban-sticky-row-mode"]).toBe("inline");
  });
});

describe("toggleStickyRowMode", () => {
  it("toggles wrap -> inline -> wrap and persists", () => {
    expect(toggleStickyRowMode()).toBe("inline");
    expect(mockLocalStorage._store["kanban-sticky-row-mode"]).toBe("inline");
    expect(toggleStickyRowMode()).toBe("wrap");
    expect(mockLocalStorage._store["kanban-sticky-row-mode"]).toBe("wrap");
  });
});
