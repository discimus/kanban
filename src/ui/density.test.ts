import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDensity, applyDensity, toggleDensity, densityIcon } from "./density";

// ---------------------------------------------------------------------------
// density.ts touches localStorage and document.documentElement only at call
// time, so we stub both (mirroring the approach used in store.test.ts).
// ---------------------------------------------------------------------------

function makeFakeRoot() {
  const attrs: Record<string, string> = {};
  return {
    attrs,
    setAttribute: (key: string, value: string) => { attrs[key] = value; },
    getAttribute: (key: string) => attrs[key] ?? null,
    removeAttribute: (key: string) => { delete attrs[key]; },
    hasAttribute: (key: string) => key in attrs
  };
}

let root: ReturnType<typeof makeFakeRoot>;
let store: Record<string, string>;

beforeEach(() => {
  root = makeFakeRoot();
  store = {};
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getDensity", () => {
  it("defaults to comfortable when nothing is stored", () => {
    expect(getDensity()).toBe("comfortable");
  });

  it("reads a stored compact preference", () => {
    store["kanban-ddd-density"] = "compact";
    expect(getDensity()).toBe("compact");
  });

  it("ignores invalid stored values", () => {
    store["kanban-ddd-density"] = "spacious";
    expect(getDensity()).toBe("comfortable");
  });
});

describe("applyDensity", () => {
  it("sets data-density=compact on the root and persists it", () => {
    applyDensity("compact");
    expect(root.attrs["data-density"]).toBe("compact");
    expect(store["kanban-ddd-density"]).toBe("compact");
  });

  it("removes the attribute for comfortable and persists it", () => {
    applyDensity("compact");
    applyDensity("comfortable");
    expect(root.hasAttribute("data-density")).toBe(false);
    expect(store["kanban-ddd-density"]).toBe("comfortable");
  });
});

describe("toggleDensity", () => {
  it("flips comfortable -> compact and back", () => {
    expect(toggleDensity()).toBe("compact");
    expect(root.attrs["data-density"]).toBe("compact");
    expect(toggleDensity()).toBe("comfortable");
    expect(root.hasAttribute("data-density")).toBe(false);
  });
});

describe("densityIcon", () => {
  it("maps each mode to a Material Symbols icon", () => {
    expect(densityIcon("comfortable")).toBe("unfold_more");
    expect(densityIcon("compact")).toBe("unfold_less");
  });
});
