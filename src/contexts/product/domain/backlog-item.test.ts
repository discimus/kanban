import { describe, it, expect } from "vitest";
import { createBacklogItem, isValidTransition } from "@contexts/product/domain/backlog-item";
import type { CreateBacklogItemProps } from "@contexts/product/domain/backlog-item";

describe("createBacklogItem", () => {
  const validProps: CreateBacklogItemProps = { productId: "p1", title: "Feature X" };

  it("returns a BacklogItem with a generated non-empty id", () => {
    const item = createBacklogItem(validProps);
    expect(item.id).toBeTruthy();
    expect(typeof item.id).toBe("string");
    expect(item.id.length).toBeGreaterThan(0);
  });

  it("returns status 'todo'", () => {
    const item = createBacklogItem(validProps);
    expect(item.status).toBe("todo");
  });

  it("priority defaults to 'medium'", () => {
    const item = createBacklogItem(validProps);
    expect(item.priority).toBe("medium");
  });

  it("classification defaults to 'task'", () => {
    const item = createBacklogItem(validProps);
    expect(item.classification).toBe("task");
  });

  it("storyPoints defaults to 0", () => {
    const item = createBacklogItem(validProps);
    expect(item.storyPoints).toBe(0);
  });

  it("trims title whitespace", () => {
    const item = createBacklogItem({ productId: "p1", title: "  Hello  " });
    expect(item.title).toBe("Hello");
  });

  it("throws Error when productId is empty", () => {
    expect(() => createBacklogItem({ productId: "", title: "X" })).toThrow(
      "O item precisa pertencer a um Projeto.",
    );
  });

  it("throws Error when title is empty", () => {
    expect(() => createBacklogItem({ productId: "p1", title: "" })).toThrow(
      "O título do item é obrigatório.",
    );
  });

  it("throws Error when title is only whitespace", () => {
    expect(() => createBacklogItem({ productId: "p1", title: "   " })).toThrow(
      "O título do item é obrigatório.",
    );
  });

  it("negative storyPoints values are clamped to 0", () => {
    const item = createBacklogItem({ ...validProps, storyPoints: -5 });
    expect(item.storyPoints).toBe(0);
  });

  it("custom priority, classification, and storyPoints are preserved", () => {
    const item = createBacklogItem({
      productId: "p1",
      title: "Bug fix",
      priority: "critical",
      classification: "bug",
      storyPoints: 8,
    });
    expect(item.priority).toBe("critical");
    expect(item.classification).toBe("bug");
    expect(item.storyPoints).toBe(8);
  });

  it("description defaults to '' when not provided", () => {
    const item = createBacklogItem(validProps);
    expect(item.description).toBe("");
  });
});

describe("isValidTransition", () => {
  it("returns true for valid transitions", () => {
    expect(isValidTransition("todo", "doing")).toBe(true);
    expect(isValidTransition("doing", "review")).toBe(true);
    expect(isValidTransition("review", "done")).toBe(true);
    expect(isValidTransition("doing", "todo")).toBe(true);
  });

  it("returns true for same-status transition (both are recognized statuses)", () => {
    expect(isValidTransition("todo", "todo")).toBe(true);
  });

  it("returns false for invalid status values", () => {
    expect(isValidTransition("invalid" as "todo", "doing" as "todo")).toBe(false);
    expect(isValidTransition("todo" as "todo", "invalid" as "todo")).toBe(false);
    expect(isValidTransition("invalid" as "todo", "nope" as "todo")).toBe(false);
  });
});
