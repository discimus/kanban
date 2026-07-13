import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState } from "@shared/types";

const { state, mockStore, mockEventBus } = vi.hoisted(() => {
  const state: AppState = { products: [], backlogItems: [], tasks: [], links: [], estimations: [] };
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
  normalizeBacklogItem: (b: unknown) => b
}));
vi.mock("@shared/events", () => ({ eventBus: mockEventBus }));

import { productService } from "@contexts/product/application/product.service";

function makeProduct(overrides: Partial<ReturnType<typeof productService.create>> = {}) {
  return {
    id: "p1",
    name: "Projeto A",
    description: "Descrição",
    createdAt: "2025-01-01T00:00:00.000Z",
    status: "backlog" as const,
    showPriority: true,
    category: "development" as const,
    ...overrides
  };
}

function makeBacklogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    productId: "p1",
    title: "Item 1",
    description: "",
    priority: "medium" as const,
    status: "todo" as const,
    storyPoints: 1,
    classification: "task" as const,
    archivedAt: null,
    ...overrides
  };
}

beforeEach(() => {
  state.products.length = 0;
  state.backlogItems.length = 0;
  state.tasks.length = 0;
  state.links.length = 0;
  state.estimations.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

describe("productService", () => {
  describe("list", () => {
    it("returns products from store", () => {
      const p = makeProduct();
      state.products = [p];
      expect(productService.list()).toEqual([p]);
    });
  });

  describe("get", () => {
    it("returns product by id", () => {
      const p = makeProduct();
      state.products = [p];
      expect(productService.get("p1")).toEqual(p);
    });

    it("returns undefined for unknown id", () => {
      expect(productService.get("nope")).toBeUndefined();
    });
  });

  describe("create", () => {
    it("calls store.update and emits product:created", () => {
      const result = productService.create("Meu Projeto", "Uma descrição");
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("product:created", result);
      expect(state.products).toHaveLength(1);
      expect(state.products[0].name).toBe("Meu Projeto");
    });

    it("defaults description to ''", () => {
      const result = productService.create("Name Only");
      expect(result.description).toBe("");
    });

    it("defaults category to 'development'", () => {
      const result = productService.create("P");
      expect(result.category).toBe("development");
    });

    it("preserves custom category 'study'", () => {
      const result = productService.create("P", "", "study");
      expect(result.category).toBe("study");
    });
  });

  describe("edit", () => {
    it("updates product and emits product:updated", () => {
      state.products = [makeProduct()];
      const result = productService.edit("p1", { name: "Renomeado", description: "Nova desc" });
      expect(result.name).toBe("Renomeado");
      expect(result.description).toBe("Nova desc");
      expect(mockEventBus.emit).toHaveBeenCalledWith("product:updated", result);
    });

    it("throws when product not found", () => {
      expect(() => productService.edit("ghost", { name: "X", description: "Y" })).toThrow(
        "Projeto não encontrado."
      );
    });

    it("changes category to 'business'", () => {
      state.products = [makeProduct()];
      const result = productService.edit("p1", { name: "P", description: "", category: "business" });
      expect(result.category).toBe("business");
    });
  });

  describe("setStatus", () => {
    it("updates status and emits product:updated", () => {
      state.products = [makeProduct()];
      const result = productService.setStatus("p1", "completed");
      expect(result.status).toBe("completed");
      expect(mockEventBus.emit).toHaveBeenCalledWith("product:updated", result);
    });
  });

  describe("delete", () => {
    it("emits product:deleted", () => {
      state.products = [makeProduct()];
      productService.delete("p1");
      expect(state.products).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("product:deleted", "p1");
    });
  });

  describe("recomputeStatus", () => {
    it('with all "todo" items → "backlog"', () => {
      state.products = [makeProduct({ status: "in_progress" })];
      state.backlogItems = [
        makeBacklogItem({ productId: "p1", status: "todo" }),
        makeBacklogItem({ id: "b2", productId: "p1", status: "todo" })
      ];
      const result = productService.recomputeStatus("p1");
      expect(result?.status).toBe("backlog");
    });

    it('with all "done" items → no automatic completion', () => {
      state.products = [makeProduct({ status: "backlog" })];
      state.backlogItems = [
        makeBacklogItem({ productId: "p1", status: "done" }),
        makeBacklogItem({ id: "b2", productId: "p1", status: "done" })
      ];
      const result = productService.recomputeStatus("p1");
      expect(result?.status).toBe("backlog");
    });

    it("allItemsDone returns true when all items are done", () => {
      state.products = [makeProduct({ status: "backlog" })];
      state.backlogItems = [
        makeBacklogItem({ productId: "p1", status: "done" }),
        makeBacklogItem({ id: "b2", productId: "p1", status: "done" })
      ];
      expect(productService.allItemsDone("p1")).toBe(true);
    });

    it("allItemsDone returns false when no items", () => {
      state.products = [makeProduct({ status: "backlog" })];
      expect(productService.allItemsDone("p1")).toBe(false);
    });

    it("with mixed items → in_progress", () => {
      state.products = [makeProduct({ status: "backlog" })];
      state.backlogItems = [
        makeBacklogItem({ productId: "p1", status: "todo" }),
        makeBacklogItem({ id: "b2", productId: "p1", status: "done" })
      ];
      const result = productService.recomputeStatus("p1");
      expect(result?.status).toBe("in_progress");
    });
  });
});
