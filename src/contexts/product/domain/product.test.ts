import { describe, it, expect } from "vitest";
import { createProduct, assertValidProductName, archive, restore } from "@contexts/product/domain/product";

describe("createProduct", () => {
  it("returns a Product with a generated non-empty id", () => {
    const product = createProduct({ name: "My Project" });
    expect(product.id).toBeTruthy();
    expect(typeof product.id).toBe("string");
    expect(product.id.length).toBeGreaterThan(0);
  });

  it("returns createdAt as an ISO string", () => {
    const product = createProduct({ name: "My Project" });
    const parsed = Date.parse(product.createdAt);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(new Date(parsed).toISOString()).toBe(product.createdAt);
  });

  it("returns status 'backlog'", () => {
    const product = createProduct({ name: "My Project" });
    expect(product.status).toBe("backlog");
  });

  it("returns showPriority: true", () => {
    const product = createProduct({ name: "My Project" });
    expect(product.showPriority).toBe(true);
  });

  it("returns autoArchiveDays as null", () => {
    const product = createProduct({ name: "My Project" });
    expect(product.autoArchiveDays).toBeNull();
  });

  it("returns autoPasteLinks as true", () => {
    const product = createProduct({ name: "My Project" });
    expect(product.autoPasteLinks).toBe(true);
  });

  it("returns showReview as true for development", () => {
    const product = createProduct({ name: "My Project" });
    expect(product.showReview).toBe(true);
  });

  it("returns showReview as false for study", () => {
    const product = createProduct({ name: "My Project", category: "study" });
    expect(product.showReview).toBe(false);
  });

  it("returns showReview as false for business", () => {
    const product = createProduct({ name: "My Project", category: "business" });
    expect(product.showReview).toBe(false);
  });

  it("trims whitespace from name", () => {
    const product = createProduct({ name: "  Hello World  " });
    expect(product.name).toBe("Hello World");
  });

  it("sets description to trimmed value or empty string default", () => {
    const withDesc = createProduct({ name: "P", description: "  Desc  " });
    expect(withDesc.description).toBe("Desc");

    const withoutDesc = createProduct({ name: "P" });
    expect(withoutDesc.description).toBe("");

    const emptyDesc = createProduct({ name: "P", description: "" });
    expect(emptyDesc.description).toBe("");
  });

  it("throws Error when name is an empty string", () => {
    expect(() => createProduct({ name: "" })).toThrow("O nome do Projeto é obrigatório.");
  });

  it("throws Error when name is only whitespace", () => {
    expect(() => createProduct({ name: "   " })).toThrow("O nome do Projeto é obrigatório.");
  });

  it("returns category 'development' by default", () => {
    const product = createProduct({ name: "P" });
    expect(product.category).toBe("development");
  });

  it("preserves category 'business'", () => {
    const product = createProduct({ name: "P", category: "business" });
    expect(product.category).toBe("business");
  });

  it("preserves category 'study'", () => {
    const product = createProduct({ name: "P", category: "study" });
    expect(product.category).toBe("study");
  });
});

describe("assertValidProductName", () => {
  it("does not throw for a valid name", () => {
    expect(() => assertValidProductName("Valid Name")).not.toThrow();
  });

  it("throws Error for an empty string", () => {
    expect(() => assertValidProductName("")).toThrow("O nome do Projeto é obrigatório.");
  });

  it("throws Error for a whitespace-only string", () => {
    expect(() => assertValidProductName("   \t  ")).toThrow("O nome do Projeto é obrigatório.");
  });
});

describe("archive", () => {
  const product = createProduct({ name: "P" });

  it("returns product with archivedAt set", () => {
    const result = archive(product, "2026-07-14T00:00:00.000Z");
    expect(result.archivedAt).toBe("2026-07-14T00:00:00.000Z");
  });

  it("preserves other fields", () => {
    const result = archive(product, "2026-07-14T00:00:00.000Z");
    expect(result.id).toBe(product.id);
    expect(result.name).toBe("P");
    expect(result.status).toBe("backlog");
  });
});

describe("restore", () => {
  const product = { ...createProduct({ name: "P" }), archivedAt: "2026-07-14T00:00:00.000Z" };

  it("clears archivedAt", () => {
    const result = restore(product);
    expect(result.archivedAt).toBeNull();
  });

  it("preserves other fields", () => {
    const result = restore(product);
    expect(result.id).toBe(product.id);
    expect(result.name).toBe("P");
    expect(result.status).toBe("backlog");
  });
});
