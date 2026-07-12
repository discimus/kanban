import { describe, it, expect } from "vitest";
import { reviveState, normalizeProduct, normalizeBacklogItem } from "@shared/storage";
import { emptyState, type Product, type BacklogItem } from "@shared/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Test Product",
    description: "",
    createdAt: "2024-01-01T00:00:00.000Z",
    status: "backlog",
    showPriority: true,
    category: "development",
    ...overrides,
  };
}

function makeBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "b1",
    productId: "p1",
    title: "Test Item",
    description: "",
    priority: "low",
    status: "todo",
    storyPoints: 1,
    classification: "task",
    ...overrides,
  };
}

describe("emptyState", () => {
  it("returns all arrays empty", () => {
    const state = emptyState();
    expect(state.products).toEqual([]);
    expect(state.backlogItems).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.links).toEqual([]);
    expect(state.estimations).toEqual([]);
  });
});

describe("reviveState", () => {
  it("returns emptyState() for null", () => {
    expect(reviveState(null)).toEqual(emptyState());
  });

  it("returns emptyState() for undefined", () => {
    expect(reviveState(undefined)).toEqual(emptyState());
  });

  it("returns all empty arrays for empty object", () => {
    expect(reviveState({})).toEqual(emptyState());
  });

  it("fills missing fields with empties for partial state", () => {
    const partial = {
      products: [makeProduct()],
    };
    const result = reviveState(partial);
    expect(result.products).toHaveLength(1);
    expect(result.backlogItems).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.links).toEqual([]);
    expect(result.estimations).toEqual([]);
  });

  it("passes through valid state correctly", () => {
    const product = makeProduct();
    const backlogItem = makeBacklogItem();
    const state = {
      products: [product],
      backlogItems: [backlogItem],
      tasks: [],
      links: [],
      estimations: [],
    };
    const result = reviveState(state);
    expect(result.products).toEqual([product]);
    expect(result.backlogItems).toEqual([backlogItem]);
  });

  it("fixes legacy data with missing showPriority and classification", () => {
    const legacyProduct = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
    } as unknown as Product;
    const legacyItem = {
      id: "b1",
      productId: "p1",
      title: "Old Item",
      description: "",
      priority: "low",
      status: "todo",
      storyPoints: 1,
    } as unknown as BacklogItem;

    const state = {
      products: [legacyProduct],
      backlogItems: [legacyItem],
      tasks: [],
      links: [],
      estimations: [],
    };
    const result = reviveState(state);
    expect(result.products[0].showPriority).toBe(true);
    expect(result.backlogItems[0].classification).toBe("task");
  });
});

describe("normalizeProduct", () => {
  it("sets showPriority: true for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.showPriority).toBe(true);
  });

  it("preserves showPriority: false", () => {
    const product = makeProduct({ showPriority: false });
    const result = normalizeProduct(product);
    expect(result.showPriority).toBe(false);
  });

  it("fixes invalid status to 'backlog'", () => {
    const product = makeProduct({ status: "invalid" as never });
    const result = normalizeProduct(product);
    expect(result.status).toBe("backlog");
  });

  it("preserves status 'completed' and adds showPriority: true when missing", () => {
    const legacy = {
      id: "p1",
      name: "Done",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "completed",
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.status).toBe("completed");
    expect(result.showPriority).toBe(true);
  });

  it("defaults category to 'development' when missing", () => {
    const legacy = {
      id: "p1",
      name: "P",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.category).toBe("development");
  });

  it("preserves valid category 'business'", () => {
    const product = makeProduct({ category: "business" });
    const result = normalizeProduct(product);
    expect(result.category).toBe("business");
  });

  it("fixes invalid category to 'development'", () => {
    const product = makeProduct({ category: "invalid" as never });
    const result = normalizeProduct(product);
    expect(result.category).toBe("development");
  });
});

describe("normalizeBacklogItem", () => {
  it("sets classification: 'task' for legacy backlogItem without it", () => {
    const legacy = {
      id: "b1",
      productId: "p1",
      title: "Old Item",
      description: "",
      priority: "low",
      status: "todo",
      storyPoints: 1,
    } as unknown as BacklogItem;
    const result = normalizeBacklogItem(legacy);
    expect(result.classification).toBe("task");
  });

  it("preserves classification: 'bug'", () => {
    const item = makeBacklogItem({ classification: "bug" });
    const result = normalizeBacklogItem(item);
    expect(result.classification).toBe("bug");
  });

  it("fixes invalid classification to 'task'", () => {
    const item = makeBacklogItem({ classification: "invalid" as never });
    const result = normalizeBacklogItem(item);
    expect(result.classification).toBe("task");
  });
});
