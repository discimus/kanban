import { describe, it, expect } from "vitest";
import { createBacklogItem, isValidTransition, changeProduct, defaultClassificationForCategory } from "@contexts/product/domain/backlog-item";
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

  it("completedAt defaults to null", () => {
    const item = createBacklogItem(validProps);
    expect(item.completedAt).toBeNull();
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

describe("changeProduct", () => {
  const item = {
    id: "b1",
    productId: "p1",
    title: "Feature X",
    description: "Desc",
    priority: "high" as const,
    status: "doing" as const,
    storyPoints: 5,
    classification: "task" as const,
    createdAt: "2025-01-01T00:00:00.000Z",
    archivedAt: "2025-01-01T00:00:00.000Z",
    completedAt: "2025-01-01T00:00:00.000Z"
  };

  it("returns item with updated productId, status todo, and null dates", () => {
    const result = changeProduct(item, "p2");
    expect(result.productId).toBe("p2");
    expect(result.status).toBe("todo");
    expect(result.archivedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("preserves other fields unchanged", () => {
    const result = changeProduct(item, "p2");
    expect(result.id).toBe("b1");
    expect(result.title).toBe("Feature X");
    expect(result.description).toBe("Desc");
    expect(result.priority).toBe("high");
    expect(result.storyPoints).toBe(5);
    expect(result.classification).toBe("task");
  });

  it("throws when newProductId is empty", () => {
    expect(() => changeProduct(item, "")).toThrow("O Projeto de destino é obrigatório.");
  });

  it("works when archivedAt and completedAt are already null", () => {
    const active = { ...item, archivedAt: null, completedAt: null };
    const result = changeProduct(active, "p2");
    expect(result.archivedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("overrides classification when classification param is provided", () => {
    const result = changeProduct(item, "p2", "bug");
    expect(result.classification).toBe("bug");
  });

  it("preserves classification when no classification param is provided", () => {
    const result = changeProduct(item, "p2");
    expect(result.classification).toBe(item.classification);
  });
});

describe("defaultClassificationForCategory", () => {
  it("returns 'task' for development", () => {
    expect(defaultClassificationForCategory("development")).toBe("task");
  });

  it("returns 'task' for business", () => {
    expect(defaultClassificationForCategory("business")).toBe("task");
  });

  it("returns 'task' for study", () => {
    expect(defaultClassificationForCategory("study")).toBe("task");
  });

  it("returns 'note' for notes", () => {
    expect(defaultClassificationForCategory("notes")).toBe("note");
  });
});
