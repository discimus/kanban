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

import { linkService } from "@contexts/link/application/link.service";

function makeLink(overrides: Record<string, unknown> = {}) {
  return {
    id: "l1",
    backlogItemId: "b1",
    url: "https://example.com",
    visitedAt: null,
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

describe("linkService", () => {
  describe("list", () => {
    it("returns links from store", () => {
      const link = makeLink();
      state.links = [link];
      expect(linkService.list()).toEqual([link]);
    });
  });

  describe("byBacklogItem", () => {
    it("filters links by backlogItemId", () => {
      const l1 = makeLink({ id: "l1", backlogItemId: "b1" });
      const l2 = makeLink({ id: "l2", backlogItemId: "b2" });
      state.links = [l1, l2];
      expect(linkService.byBacklogItem("b1")).toEqual([l1]);
    });
  });

  describe("get", () => {
    it("returns link by id", () => {
      const link = makeLink();
      state.links = [link];
      expect(linkService.get("l1")).toEqual(link);
    });
  });

  describe("create", () => {
    it("adds link and emits link:created", () => {
      const result = linkService.create({ backlogItemId: "b1", url: "https://foo.bar" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("link:created", result);
      expect(state.links).toHaveLength(1);
    });
  });

  describe("changeUrl", () => {
    it("updates url and emits link:updated", () => {
      state.links = [makeLink({ url: "https://old.example.com" })];
      const result = linkService.changeUrl("l1", "https://new.example.com");
      expect(result.url).toBe("https://new.example.com");
      expect(mockEventBus.emit).toHaveBeenCalledWith("link:updated", result);
    });

    it("throws when link not found", () => {
      expect(() => linkService.changeUrl("ghost", "https://x.com")).toThrow("Link não encontrado.");
    });
  });

  describe("markAsVisited", () => {
    it("updates visitedAt and emits link:visited", () => {
      state.links = [makeLink()];
      const result = linkService.markAsVisited("l1");
      expect(result.visitedAt).toBeTypeOf("string");
      expect(result.id).toBe("l1");
      expect(mockEventBus.emit).toHaveBeenCalledWith("link:visited", result);
    });

    it("throws when link not found", () => {
      expect(() => linkService.markAsVisited("ghost")).toThrow("Link não encontrado.");
    });
  });

  describe("delete", () => {
    it("removes link and emits link:deleted", () => {
      state.links = [makeLink()];
      linkService.delete("l1");
      expect(state.links).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("link:deleted", "l1");
    });
  });
});
