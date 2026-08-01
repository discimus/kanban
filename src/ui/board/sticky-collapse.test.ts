import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLocalStorage } = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    mockLocalStorage: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      _store: store,
      _clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    },
  };
});

beforeEach(() => {
  mockLocalStorage._clear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
  });
});

import { isStickyCollapsed, setStickyCollapsed } from "./sticky-collapse";

describe("isStickyCollapsed", () => {
  it("returns false when nothing is stored", () => {
    expect(isStickyCollapsed("p1")).toBe(false);
  });

  it("returns true when '1' is stored", () => {
    mockLocalStorage._store["kanban-sticky-collapsed:p1"] = "1";
    expect(isStickyCollapsed("p1")).toBe(true);
  });

  it("returns false for other stored values", () => {
    mockLocalStorage._store["kanban-sticky-collapsed:p1"] = "0";
    expect(isStickyCollapsed("p1")).toBe(false);
  });

  it("is scoped per product", () => {
    mockLocalStorage._store["kanban-sticky-collapsed:p1"] = "1";
    expect(isStickyCollapsed("p1")).toBe(true);
    expect(isStickyCollapsed("p2")).toBe(false);
  });
});

describe("setStickyCollapsed", () => {
  it("persists '1' when collapsed", () => {
    setStickyCollapsed("p1", true);
    expect(mockLocalStorage._store["kanban-sticky-collapsed:p1"]).toBe("1");
  });

  it("removes the key when expanded", () => {
    mockLocalStorage._store["kanban-sticky-collapsed:p1"] = "1";
    setStickyCollapsed("p1", false);
    expect(mockLocalStorage._store["kanban-sticky-collapsed:p1"]).toBeUndefined();
  });
});
