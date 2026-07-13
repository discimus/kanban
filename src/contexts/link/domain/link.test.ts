import { describe, it, expect } from "vitest";
import { createLink, changeUrl, markAsVisited } from "@contexts/link/domain/link";

describe("createLink", () => {
  it("returns a Link with generated id", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    expect(link.id).toBeTypeOf("string");
    expect(link.id.length).toBeGreaterThan(0);
  });

  it("stores the URL as provided", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    expect(link.url).toBe("https://example.com");
  });

  it("trims whitespace from URL", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "  https://example.com  " });
    expect(link.url).toBe("https://example.com");
  });

  it("throws Error when backlogItemId is empty", () => {
    expect(() => createLink({ backlogItemId: "", url: "https://example.com" })).toThrow(Error);
  });

  it("throws Error when URL is empty", () => {
    expect(() => createLink({ backlogItemId: "bi-1", url: "" })).toThrow(Error);
  });

  it("throws Error when URL is only whitespace", () => {
    expect(() => createLink({ backlogItemId: "bi-1", url: "   " })).toThrow(Error);
  });
});

describe("markAsVisited", () => {
  it("returns new object with different reference", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const visited = markAsVisited(link, "2026-07-12T14:30:00.000Z");
    expect(visited).not.toBe(link);
  });

  it("sets visitedAt to the provided timestamp", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const visited = markAsVisited(link, "2026-07-12T14:30:00.000Z");
    expect(visited.visitedAt).toBe("2026-07-12T14:30:00.000Z");
  });

  it("preserves other properties", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const visited = markAsVisited(link, "2026-07-12T14:30:00.000Z");
    expect(visited.id).toBe(link.id);
    expect(visited.backlogItemId).toBe(link.backlogItemId);
    expect(visited.url).toBe(link.url);
  });

  it("can be called multiple times, updating visitedAt", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const t1 = markAsVisited(link, "2026-07-12T10:00:00.000Z");
    const t2 = markAsVisited(t1, "2026-07-12T15:00:00.000Z");
    expect(t2.visitedAt).toBe("2026-07-12T15:00:00.000Z");
  });
});

describe("changeUrl", () => {
  it("returns new object with different reference", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const updated = changeUrl(link, "https://new.example.com");
    expect(updated).not.toBe(link);
  });

  it("changes URL to the new value", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const updated = changeUrl(link, "https://new.example.com");
    expect(updated.url).toBe("https://new.example.com");
  });

  it("trims the new URL", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const updated = changeUrl(link, "  https://new.example.com  ");
    expect(updated.url).toBe("https://new.example.com");
  });

  it("throws Error when new URL is empty", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    expect(() => changeUrl(link, "")).toThrow(Error);
  });

  it("other properties remain unchanged", () => {
    const link = createLink({ backlogItemId: "bi-1", url: "https://example.com" });
    const updated = changeUrl(link, "https://new.example.com");
    expect(updated.id).toBe(link.id);
    expect(updated.backlogItemId).toBe(link.backlogItemId);
    expect(updated.visitedAt).toBe(link.visitedAt);
  });
});
