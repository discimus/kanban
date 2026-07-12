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

import { taskService } from "@contexts/task/application/task.service";

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    backlogItemId: "b1",
    title: "Tarefa X",
    status: "todo" as const,
    assignedTo: "",
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

describe("taskService", () => {
  describe("list", () => {
    it("returns tasks from store", () => {
      const t = makeTask();
      state.tasks = [t];
      expect(taskService.list()).toEqual([t]);
    });
  });

  describe("byBacklogItem", () => {
    it("filters tasks", () => {
      const t1 = makeTask({ id: "t1", backlogItemId: "b1" });
      const t2 = makeTask({ id: "t2", backlogItemId: "b2" });
      state.tasks = [t1, t2];
      expect(taskService.byBacklogItem("b1")).toEqual([t1]);
    });
  });

  describe("get", () => {
    it("returns task by id", () => {
      const t = makeTask();
      state.tasks = [t];
      expect(taskService.get("t1")).toEqual(t);
    });
  });

  describe("create", () => {
    it("adds task and emits task:created", () => {
      const result = taskService.create({ backlogItemId: "b1", title: "Fazer algo" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("task:created", result);
      expect(state.tasks).toHaveLength(1);
    });
  });

  describe("changeStatus", () => {
    it("updates status and emits task:updated", () => {
      state.tasks = [makeTask({ status: "todo" })];
      const result = taskService.changeStatus("t1", "doing");
      expect(result.status).toBe("doing");
      expect(mockEventBus.emit).toHaveBeenCalledWith("task:updated", result);
    });

    it("throws when task not found", () => {
      expect(() => taskService.changeStatus("ghost", "done")).toThrow("Tarefa não encontrada.");
    });
  });

  describe("rename", () => {
    it("updates title", () => {
      state.tasks = [makeTask({ title: "Velho" })];
      const result = taskService.rename("t1", "Novo título");
      expect(result.title).toBe("Novo título");
      expect(mockEventBus.emit).toHaveBeenCalledWith("task:updated", result);
    });

    it("throws on empty title", () => {
      state.tasks = [makeTask()];
      expect(() => taskService.rename("t1", "")).toThrow("título");
    });
  });

  describe("assign", () => {
    it("updates assignedTo", () => {
      state.tasks = [makeTask({ assignedTo: "" })];
      const result = taskService.assign("t1", "João");
      expect(result.assignedTo).toBe("João");
      expect(mockEventBus.emit).toHaveBeenCalledWith("task:updated", result);
    });
  });

  describe("delete", () => {
    it("removes task from store", () => {
      state.tasks = [makeTask()];
      taskService.delete("t1");
      expect(state.tasks).toHaveLength(0);
    });
  });
});
