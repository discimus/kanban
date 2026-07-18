import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState } from "@shared/types";

const { state, mockStore, mockEventBus } = vi.hoisted(() => {
  const state: AppState = { products: [], backlogItems: [], tasks: [], links: [], comments: [], images: [], estimations: [] };
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

import { estimationService } from "@contexts/estimation/application/estimation.service";

function makeEstimation(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    taskId: "t1",
    estimate: 5,
    createdAt: "2025-06-01T00:00:00.000Z",
    comment: "",
    ...overrides
  };
}

beforeEach(() => {
  state.products.length = 0;
  state.backlogItems.length = 0;
  state.tasks.length = 0;
  state.links.length = 0;
  state.comments.length = 0;
  state.images.length = 0;
  state.estimations.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

describe("estimationService", () => {
  describe("history", () => {
    it("returns sorted estimations for task (newest first)", () => {
      const old = makeEstimation({ id: "e1", createdAt: "2025-01-01T00:00:00.000Z" });
      const mid = makeEstimation({ id: "e2", createdAt: "2025-03-15T00:00:00.000Z" });
      const recent = makeEstimation({ id: "e3", createdAt: "2025-06-01T00:00:00.000Z" });
      state.estimations = [old, recent, mid];
      const result = estimationService.history("t1");
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("e3");
      expect(result[1].id).toBe("e2");
      expect(result[2].id).toBe("e1");
    });
  });

  describe("log", () => {
    it("creates entry and emits estimation:logged", () => {
      const result = estimationService.log({ taskId: "t1", estimate: 8, comment: "Parece razoável" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("estimation:logged", result);
      expect(state.estimations).toHaveLength(1);
      expect(result.estimate).toBe(8);
      expect(result.comment).toBe("Parece razoável");
    });

    it("estimate 0 is valid", () => {
      const result = estimationService.log({ taskId: "t1", estimate: 0 });
      expect(result.estimate).toBe(0);
      expect(state.estimations).toHaveLength(1);
    });
  });

  describe("delete", () => {
    it("removes entry", () => {
      state.estimations = [makeEstimation()];
      estimationService.delete("e1");
      expect(state.estimations).toHaveLength(0);
    });
  });
});
