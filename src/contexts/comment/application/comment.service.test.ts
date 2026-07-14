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

import { commentService } from "@contexts/comment/application/comment.service";

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    backlogItemId: "b1",
    text: "Comentário de teste",
    createdAt: "2026-07-13T00:00:00.000Z",
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
});

describe("commentService", () => {
  describe("byBacklogItem", () => {
    it("filters comments by backlogItemId", () => {
      const c1 = makeComment({ id: "c1", backlogItemId: "b1" });
      const c2 = makeComment({ id: "c2", backlogItemId: "b2" });
      state.comments = [c1, c2];
      expect(commentService.byBacklogItem("b1")).toEqual([c1]);
    });
  });

  describe("create", () => {
    it("adds comment and emits comment:created", () => {
      const result = commentService.create({ backlogItemId: "b1", text: "Novo comentário" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("comment:created", result);
      expect(state.comments).toHaveLength(1);
    });
  });

  describe("edit", () => {
    it("updates comment text and emits comment:updated", () => {
      state.comments = [makeComment()];
      const updated = commentService.edit("c1", "Texto editado");
      expect(updated.text).toBe("Texto editado");
      expect(updated.updatedAt).toBeTypeOf("string");
      expect(mockEventBus.emit).toHaveBeenCalledWith("comment:updated", updated);
    });

    it("throws when comment does not exist", () => {
      expect(() => commentService.edit("inexistente", "novo")).toThrow(Error);
    });
  });

  describe("delete", () => {
    it("removes comment and emits comment:deleted", () => {
      state.comments = [makeComment()];
      commentService.delete("c1");
      expect(state.comments).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("comment:deleted", "c1");
    });
  });
});
