import { describe, it, expect } from "vitest";
import { createProduct, assertValidProductName } from "@contexts/product/domain/product";

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
