import { describe, it, expect } from "vitest";
import { uuid, nowISO, formatDate, toDateInputValue, fromDateInputValue } from "@shared/utils";

describe("uuid", () => {
  it("returns a non-empty string", () => {
    const result = uuid();
    expect(result).toBeTypeOf("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a string in UUID-like format (8-4-4-4-12 hex chars with dashes)", () => {
    const result = uuid();
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("returns unique values on multiple calls", () => {
    const results = new Set(Array.from({ length: 50 }, () => uuid()));
    expect(results.size).toBe(50);
  });
});

describe("nowISO", () => {
  it("returns a string in ISO 8601 format", () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("ends with 'Z'", () => {
    const result = nowISO();
    expect(result.endsWith("Z")).toBe(true);
  });
});

describe("formatDate", () => {
  it("returns a string containing numbers/slashes for a valid date", () => {
    const result = formatDate("2024-03-15T10:00:00.000Z");
    expect(result).toMatch(/\d/);
    expect(result).toMatch(/\//);
  });

  it("returns '—' for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns '—' for an invalid date", () => {
    expect(formatDate("invalid")).toBe("—");
  });
});

describe("toDateInputValue", () => {
  it("returns '2024-03-15' for a full ISO string", () => {
    expect(toDateInputValue("2024-03-15T10:00:00.000Z")).toBe("2024-03-15");
  });

  it("returns '' for null", () => {
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("fromDateInputValue", () => {
  it("returns null for an empty string", () => {
    expect(fromDateInputValue("")).toBeNull();
  });

  it("returns an ISO string for a valid date input", () => {
    const result = fromDateInputValue("2024-03-15");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
