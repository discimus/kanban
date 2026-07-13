import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState, Product } from "@shared/types";

const { state, mockStore, mockEventBus } = vi.hoisted(() => {
  const state: AppState = { products: [], backlogItems: [], tasks: [], links: [], comments: [], estimations: [] };
  return {
    state,
    mockStore: {
      getState: () => state,
      update: vi.fn((recipe: (s: AppState) => void) => { recipe(state); })
    },
    mockEventBus: {
      emit: vi.fn(),
      on: vi.fn()
    }
  };
});

vi.mock("@shared/storage", () => ({
  store: mockStore,
  reviveState: (r: unknown) => r,
  normalizeProduct: (p: unknown) => p,
  normalizeBacklogItem: (b: unknown) => b,
  normalizeLink: (l: unknown) => l
}));
vi.mock("@shared/events", () => ({ eventBus: mockEventBus }));

import {
  validateAndImport,
  exportAllState,
  exportProductState
} from "@contexts/product/application/export.service";

beforeEach(() => {
  state.products.length = 0;
  state.backlogItems.length = 0;
  state.tasks.length = 0;
  state.links.length = 0;
  state.comments.length = 0;
  state.estimations.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Projeto",
    description: "",
    createdAt: "2025-01-01T00:00:00.000Z",
    status: "backlog" as string,
    showPriority: true,
    category: "development" as string,
    ...overrides
  } as { id: string; name: string; description: string; createdAt: string; status: string; showPriority: boolean; category: string };
}

describe("validateAndImport", () => {
  it("valid JSON with all entities → success true", () => {
    const json = JSON.stringify({
      products: [validProduct()],
      backlogItems: [{ id: "b1", productId: "p1", title: "Item", description: "", priority: "medium", status: "todo", storyPoints: 1, classification: "task" }],
      tasks: [{ id: "t1", backlogItemId: "b1", title: "T", status: "todo", assignedTo: "" }],
      links: [{ id: "l1", backlogItemId: "b1", url: "https://x.com" }],
      estimations: [{ id: "e1", taskId: "t1", estimate: 3, createdAt: "2025-01-01T00:00:00.000Z", comment: "" }]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(true);
  });

  it("invalid JSON (malformed) → error about JSON", () => {
    const result = validateAndImport("{malformed");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/JSON/);
  });

  it("not an object → error", () => {
    const result = validateAndImport("42");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/objeto/);
  });

  it("missing products array → error", () => {
    const result = validateAndImport("{}");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/products/);
  });

  it("product with missing name → error", () => {
    const json = JSON.stringify({
      products: [{ id: "p1", description: "", createdAt: "2025-01-01T00:00:00.000Z", status: "backlog" }]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name/);
  });

  it("product with invalid status → error", () => {
    const json = JSON.stringify({
      products: [validProduct({ status: "weird" })]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Status inválido/);
  });

  it("product with invalid category → error", () => {
    const json = JSON.stringify({
      products: [validProduct({ category: "invalid_cat" })]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Categoria inválida/);
  });

  it("backlogItem with invalid priority → error", () => {
    const json = JSON.stringify({
      products: [validProduct()],
      backlogItems: [{ id: "b1", productId: "p1", title: "X", description: "", priority: "urgent", status: "todo", storyPoints: 1, classification: "task" }]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/prioridade/i);
  });

  it("backlogItem with invalid classification → error", () => {
    const json = JSON.stringify({
      products: [validProduct()],
      backlogItems: [{ id: "b1", productId: "p1", title: "X", description: "", priority: "low", status: "todo", storyPoints: 1, classification: "epic" }]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/classificação/i);
  });

  it("task with invalid status → error", () => {
    const json = JSON.stringify({
      products: [validProduct()],
      tasks: [{ id: "t1", backlogItemId: "b1", title: "T", status: "backlog", assignedTo: "" }]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Status inválido na task/i);
  });

  it("link with missing url → error", () => {
    const json = JSON.stringify({
      products: [validProduct()],
      links: [{ id: "l1", backlogItemId: "b1" }]
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/url/);
  });

  it("doImport merges without duplicating existing IDs", () => {
    state.products = [validProduct({ id: "p1", name: "Existente" }) as Product];
    const json = JSON.stringify({
      products: [validProduct({ id: "p1", name: "Diferente" }), validProduct({ id: "p2", name: "Novo" })],
      backlogItems: [],
      tasks: [],
      links: [],
      estimations: []
    });
    const result = validateAndImport(json);
    expect(result.success).toBe(true);
    expect(state.products).toHaveLength(2);
    const p1 = state.products.find((p) => p.id === "p1");
    expect(p1?.name).toBe("Existente");
  });
});

describe("exportAllState", () => {
  it("returns the state from store", () => {
    state.products = [validProduct() as Product];
    const exported = exportAllState();
    expect(exported).toBe(state);
  });
});

describe("exportProductState", () => {
  it("returns null for unknown product id", () => {
    expect(exportProductState("ghost")).toBeNull();
  });

  it("returns product + related backlogItems, tasks, links, estimations for valid id", () => {
    state.products = [validProduct({ id: "p1" }) as Product];
    state.backlogItems = [
      { id: "b1", productId: "p1", title: "B1", description: "", priority: "medium" as const, status: "todo" as const, storyPoints: 1, classification: "task" as const, archivedAt: null },
      { id: "b2", productId: "p1", title: "B2", description: "", priority: "low" as const, status: "doing" as const, storyPoints: 2, classification: "bug" as const, archivedAt: null }
    ];
    state.tasks = [
      { id: "t1", backlogItemId: "b1", title: "T1", status: "todo" as const, assignedTo: "" }
    ];
    state.links = [
      { id: "l1", backlogItemId: "b1", url: "https://x.com", visitedAt: null }
    ];
    state.estimations = [
      { id: "e1", taskId: "t1", estimate: 8, createdAt: "2025-01-01T00:00:00.000Z", comment: "" }
    ];

    const result = exportProductState("p1");
    expect(result).not.toBeNull();
    expect(result!.products).toHaveLength(1);
    expect(result!.backlogItems).toHaveLength(2);
    expect(result!.tasks).toHaveLength(1);
    expect(result!.links).toHaveLength(1);
    expect(result!.estimations).toHaveLength(1);
  });
});
