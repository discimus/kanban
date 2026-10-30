import { describe, it, expect } from "vitest";
import { createProduct } from "@contexts/product/domain/product";
import { countActiveByCategory } from "./sidebar-counts";

function product(name: string, category: "development" | "business" | "study" | "notes", archived = false) {
  const created = createProduct({ name, category });
  return archived ? { ...created, archivedAt: "2026-01-01T00:00:00.000Z" } : created;
}

describe("countActiveByCategory", () => {
  it("starts every category at zero", () => {
    const counts = countActiveByCategory([]);
    expect(counts.total).toBe(0);
    expect(counts.byCategory).toEqual({
      development: 0,
      business: 0,
      study: 0,
      notes: 0
    });
  });

  it("counts active projects by category", () => {
    const counts = countActiveByCategory([
      product("A", "development"),
      product("B", "development"),
      product("C", "business"),
      product("D", "study"),
      product("E", "notes"),
      product("F", "notes")
    ]);

    expect(counts.total).toBe(6);
    expect(counts.byCategory).toEqual({
      development: 2,
      business: 1,
      study: 1,
      notes: 2
    });
  });

  it("excludes archived projects from both total and categories", () => {
    const counts = countActiveByCategory([
      product("Active", "development"),
      product("Archived", "development", true),
      product("Archived notes", "notes", true)
    ]);

    expect(counts.total).toBe(1);
    expect(counts.byCategory.development).toBe(1);
    expect(counts.byCategory.notes).toBe(0);
  });
});
