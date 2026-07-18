import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState } from "@shared/types";

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
  normalizeBacklogItem: (b: unknown) => b
}));
vi.mock("@shared/events", () => ({ eventBus: mockEventBus }));

vi.mock("@contexts/product/infrastructure/product.repository", () => ({
  productRepository: {
    all: vi.fn(() => [])
  }
}));

vi.mock("@contexts/product/application/product.service", () => ({
  productService: {
    get: vi.fn(() => ({
      id: "p1",
      name: "P",
      description: "",
      createdAt: "",
      status: "backlog",
      showPriority: true,
      category: "development",
      autoArchiveDays: null,
      autoPasteLinks: true,
      showReview: true,
      boardMode: "kanban",
      archivedAt: null
    })),
    recomputeStatus: vi.fn(),
    allItemsDone: vi.fn(() => false)
  }
}));

import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";

function makeBacklogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    productId: "p1",
    title: "Item A",
    description: "",
    priority: "medium" as const,
    status: "todo" as const,
    storyPoints: 3,
    classification: "task" as const,
    archivedAt: null,
    completedAt: null,
    ...overrides
  };
}

beforeEach(() => {
  state.products.length = 0;
  state.backlogItems.length = 0;
  state.tasks.length = 0;
  state.links.length = 0;
  state.comments.length = 0;
  state.estimations.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
  vi.mocked(productService.get).mockReturnValue({
    id: "p1",
    name: "P",
    description: "",
    createdAt: "",
    status: "backlog",
    showPriority: true,
    category: "development",
    autoArchiveDays: null,
    autoPasteLinks: true,
    showReview: true,
      boardMode: "kanban",
      archivedAt: null
  });
  vi.mocked(productService.recomputeStatus).mockClear();
});

describe("backlogService", () => {
  describe("list", () => {
    it("returns backlog items from store", () => {
      const item = makeBacklogItem();
      state.backlogItems = [item];
      expect(backlogService.list()).toEqual([item]);
    });
  });

  describe("byProduct", () => {
    it("filters items by productId", () => {
      const b1 = makeBacklogItem({ id: "b1", productId: "p1" });
      const b2 = makeBacklogItem({ id: "b2", productId: "p2" });
      state.backlogItems = [b1, b2];
      expect(backlogService.byProduct("p1")).toEqual([b1]);
    });
  });

  describe("get", () => {
    it("returns item by id", () => {
      const item = makeBacklogItem();
      state.backlogItems = [item];
      expect(backlogService.get("b1")).toEqual(item);
    });
  });

  describe("create", () => {
    it("calls store.update and emits backlog:created", () => {
      const result = backlogService.create({ productId: "p1", title: "Novo Item" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:created", result);
      expect(state.backlogItems).toHaveLength(1);
    });

    it("throws when product is completed", () => {
      vi.mocked(productService.get).mockReturnValueOnce({
        id: "p1",
        name: "P",
        description: "",
        createdAt: "",
        status: "completed",
        showPriority: true,
      category: "development",
      autoArchiveDays: null,
      autoPasteLinks: true,
      showReview: true,
      boardMode: "kanban",
      archivedAt: null
      });
      expect(() => backlogService.create({ productId: "p1", title: "Item" })).toThrow(
        /concluído/
      );
    });
  });

  describe("edit", () => {
    it("updates and emits backlog:updated", () => {
      state.backlogItems = [makeBacklogItem()];
      const result = backlogService.edit("b1", {
        title: "Renomeado",
        description: "Nova",
        priority: "high",
        storyPoints: 8,
        classification: "bug"
      });
      expect(result.title).toBe("Renomeado");
      expect(result.priority).toBe("high");
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:updated", result);
    });
  });

  describe("classify", () => {
    it("updates classification and emits", () => {
      state.backlogItems = [makeBacklogItem({ classification: "task" })];
      const result = backlogService.classify("b1", "bug");
      expect(result.classification).toBe("bug");
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:updated", result);
    });

    it("same classification returns existing without update", () => {
      state.backlogItems = [makeBacklogItem({ classification: "bug" })];
      const before = state.backlogItems[0];
      const result = backlogService.classify("b1", "bug");
      expect(result).toBe(before);
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe("setStoryPoints", () => {
    it("updates story points and emits", () => {
      state.backlogItems = [makeBacklogItem({ storyPoints: 3 })];
      const result = backlogService.setStoryPoints("b1", 13);
      expect(result.storyPoints).toBe(13);
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:updated", result);
    });
  });

  describe("move", () => {
    it("updates status and emits backlog:moved", () => {
      state.backlogItems = [makeBacklogItem({ status: "todo" })];
      const result = backlogService.move("b1", "doing");
      expect(result.status).toBe("doing");
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:moved", result);
      expect(productService.recomputeStatus).toHaveBeenCalledWith("p1");
    });

    it("same status returns existing without update", () => {
      state.backlogItems = [makeBacklogItem({ status: "todo" })];
      const existing = state.backlogItems[0];
      const result = backlogService.move("b1", "todo");
      expect(result).toBe(existing);
      expect(mockEventBus.emit).not.toHaveBeenCalledWith("backlog:moved", expect.anything());
      expect(productService.recomputeStatus).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("emits backlog:deleted", () => {
      state.backlogItems = [makeBacklogItem()];
      backlogService.delete("b1");
      expect(state.backlogItems).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:deleted", "b1");
    });
  });

  describe("changeProduct", () => {
    beforeEach(() => {
      vi.mocked(productService.get).mockImplementation((id: string) => {
        if (id === "p1") return { id: "p1", name: "Source", status: "backlog", description: "", createdAt: "", showPriority: true, category: "development", autoArchiveDays: null, autoPasteLinks: true, showReview: true,
      boardMode: "kanban",
      archivedAt: null };
        if (id === "p2") return { id: "p2", name: "Target", status: "backlog", description: "", createdAt: "", showPriority: true, category: "development", autoArchiveDays: null, autoPasteLinks: true, showReview: true,
      boardMode: "kanban",
      archivedAt: null };
        return undefined;
      });
    });

    it("saves item with updated productId and status todo", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1", status: "doing", archivedAt: "2025-01-01T00:00:00.000Z", completedAt: "2025-01-01T00:00:00.000Z" })];
      const result = backlogService.changeProduct("b1", "p2");
      expect(result.productId).toBe("p2");
      expect(result.status).toBe("todo");
      expect(result.archivedAt).toBeNull();
      expect(result.completedAt).toBeNull();
      expect(mockStore.update).toHaveBeenCalled();
    });

    it("emits backlog:product-changed", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1" })];
      const result = backlogService.changeProduct("b1", "p2");
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:product-changed", result);
    });

    it("recomputes status for source and target products", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1" })];
      backlogService.changeProduct("b1", "p2");
      expect(productService.recomputeStatus).toHaveBeenCalledWith("p1");
      expect(productService.recomputeStatus).toHaveBeenCalledWith("p2");
    });

    it("throws when source product is completed", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1" })];
      vi.mocked(productService.get).mockImplementation((id: string) => {
        if (id === "p1") return { id: "p1", name: "Source", status: "completed", description: "", createdAt: "", showPriority: true, category: "development", autoArchiveDays: null, autoPasteLinks: true, showReview: true,
      boardMode: "kanban",
      archivedAt: null };
        if (id === "p2") return { id: "p2", name: "Target", status: "backlog", description: "", createdAt: "", showPriority: true, category: "development", autoArchiveDays: null, autoPasteLinks: true, showReview: true,
      boardMode: "kanban",
      archivedAt: null };
        return undefined;
      });
      expect(() => backlogService.changeProduct("b1", "p2")).toThrow(/concluído/);
    });

    it("throws when target product is completed", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1" })];
      vi.mocked(productService.get).mockImplementation((id: string) => {
        if (id === "p1") return { id: "p1", name: "Source", status: "backlog", description: "", createdAt: "", showPriority: true, category: "development", autoArchiveDays: null, autoPasteLinks: true, showReview: true,
      boardMode: "kanban",
      archivedAt: null };
        if (id === "p2") return { id: "p2", name: "Target", status: "completed", description: "", createdAt: "", showPriority: true, category: "development", autoArchiveDays: null, autoPasteLinks: true, showReview: true,
      boardMode: "kanban",
      archivedAt: null };
        return undefined;
      });
      expect(() => backlogService.changeProduct("b1", "p2")).toThrow(/concluído/);
    });

    it("throws when target product does not exist", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1" })];
      expect(() => backlogService.changeProduct("b1", "nonexistent")).toThrow("Projeto de destino não encontrado");
    });

    it("same productId returns existing without update", () => {
      state.backlogItems = [makeBacklogItem({ productId: "p1" })];
      const existing = state.backlogItems[0];
      const result = backlogService.changeProduct("b1", "p1");
      expect(result).toBe(existing);
      expect(mockStore.update).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });
});
