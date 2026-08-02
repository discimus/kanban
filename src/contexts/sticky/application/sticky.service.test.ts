import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState, Sticky } from "@shared/types";

const { state, mockStore, mockEventBus } = vi.hoisted(() => {
  const state: AppState = {
    products: [],
    backlogItems: [],
    tasks: [],
    links: [],
    comments: [],
    images: [],
    audios: [],
    estimations: [],
    stickies: []
  };
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

import { stickyService } from "@contexts/sticky/application/sticky.service";

function makeSticky(overrides: Partial<Sticky> = {}): Sticky {
  return {
    id: "s1",
    productId: "p1",
    createdAt: "2024-01-01T00:00:00.000Z",
    title: "",
    description: "",
    links: [],
    comments: [],
    images: [],
    ...overrides
  };
}

beforeEach(() => {
  state.stickies = [];
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

describe("stickyService", () => {
  describe("byProduct", () => {
    it("returns stickies filtered by product", () => {
      const s1 = makeSticky({ id: "s1", productId: "p1" });
      const s2 = makeSticky({ id: "s2", productId: "p2" });
      state.stickies = [s1, s2];
      expect(stickyService.byProduct("p1")).toEqual([s1]);
    });
  });

  describe("create", () => {
    it("adds a sticky and emits sticky:created", () => {
      const result = stickyService.create({ productId: "p1" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:created", result);
      expect(state.stickies).toHaveLength(1);
      expect(state.stickies![0].links).toEqual([]);
    });

    it("creates a sticky with title and description", () => {
      const result = stickyService.create({ productId: "p1", title: "Pendências", description: "Revisar" });
      expect(result.title).toBe("Pendências");
      expect(result.description).toBe("Revisar");
      expect(state.stickies![0].title).toBe("Pendências");
      expect(state.stickies![0].description).toBe("Revisar");
    });
  });

  describe("delete", () => {
    it("removes the sticky and emits sticky:deleted", () => {
      state.stickies = [makeSticky()];
      stickyService.delete("s1");
      expect(state.stickies).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:deleted", "s1");
    });
  });

  describe("convertFromBacklog", () => {
    it("converts a backlog item into a sticky preserving content", () => {
      state.backlogItems = [{
        id: "bi1",
        productId: "p1",
        title: "Tarefa A",
        description: "Descrição A",
        priority: "high",
        status: "doing",
        storyPoints: 3,
        classification: "task",
        createdAt: "2024-01-01T00:00:00.000Z",
        archivedAt: null,
        completedAt: null
      }];
      state.links = [{ id: "l1", backlogItemId: "bi1", url: "https://x.com", visitedAt: "2024-01-02T00:00:00.000Z" }];
      state.comments = [{ id: "c1", backlogItemId: "bi1", text: "Olá", createdAt: "2024-01-01T00:00:00.000Z" }];
      state.images = [{
        id: "i1",
        backlogItemId: "bi1",
        dataUrl: "data:image/png;base64,a=",
        filename: "a.png",
        mimeType: "image/png",
        fileSize: 2048,
        createdAt: "2024-01-01T00:00:00.000Z"
      }];

      const result = stickyService.convertFromBacklog("bi1");

      expect(state.backlogItems).toHaveLength(0);
      expect(state.stickies).toHaveLength(1);
      expect(result.title).toBe("Tarefa A");
      expect(result.description).toBe("Descrição A");
      expect(result.links).toHaveLength(1);
      expect(result.links[0].url).toBe("https://x.com");
      expect(result.links[0].visitedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].text).toBe("Olá");
      expect(result.images).toHaveLength(1);
      expect(result.images[0].filename).toBe("a.png");
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:created", result);
      expect(mockEventBus.emit).toHaveBeenCalledWith("backlog:deleted", "bi1");
    });

    it("throws when backlog item not found", () => {
      expect(() => stickyService.convertFromBacklog("ghost")).toThrow("Item de backlog não encontrado.");
    });
  });

  describe("updateContent", () => {
    it("updates title and description, saves and emits sticky:content-updated", () => {
      state.stickies = [makeSticky()];
      const result = stickyService.updateContent("s1", { title: "  Pendências  ", description: " Revisar " });
      expect(result.title).toBe("Pendências");
      expect(result.description).toBe("Revisar");
      expect(state.stickies![0].title).toBe("Pendências");
      expect(state.stickies![0].description).toBe("Revisar");
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:content-updated", result);
    });

    it("allows clearing title and description", () => {
      state.stickies = [makeSticky({ title: "Título", description: "Descrição" })];
      const result = stickyService.updateContent("s1", { title: "", description: "" });
      expect(result.title).toBe("");
      expect(result.description).toBe("");
    });

    it("throws when sticky not found", () => {
      expect(() => stickyService.updateContent("ghost", { title: "a", description: "b" })).toThrow("Card não encontrado.");
    });
  });

  describe("addLink", () => {
    it("adds a link, saves and emits sticky:link-added", () => {
      state.stickies = [makeSticky()];
      const result = stickyService.addLink("s1", { url: "https://example.com" });
      expect(result.links).toHaveLength(1);
      expect(state.stickies![0].links).toHaveLength(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:link-added", result);
    });

    it("throws when sticky not found", () => {
      expect(() => stickyService.addLink("ghost", { url: "https://x.com" })).toThrow("Card não encontrado.");
    });
  });

  describe("markLinkVisited", () => {
    it("sets visitedAt and emits sticky:link-visited", () => {
      state.stickies = [makeSticky({ links: [{ id: "l1", url: "https://x.com", visitedAt: null }] })];
      const result = stickyService.markLinkVisited("s1", "l1");
      expect(result.links[0].visitedAt).toBeTypeOf("string");
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:link-visited", result);
    });

    it("increments visitCount", () => {
      state.stickies = [makeSticky({ links: [{ id: "l1", url: "https://x.com", visitedAt: null }] })];
      const first = stickyService.markLinkVisited("s1", "l1");
      state.stickies[0] = first;
      const second = stickyService.markLinkVisited("s1", "l1");
      expect(first.links[0].visitCount).toBe(1);
      expect(second.links[0].visitCount).toBe(2);
    });
  });

  describe("removeLink", () => {
    it("removes the link and emits sticky:link-removed", () => {
      state.stickies = [makeSticky({ links: [{ id: "l1", url: "https://x.com", visitedAt: null }] })];
      const result = stickyService.removeLink("s1", "l1");
      expect(result.links).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:link-removed", result);
    });
  });

  describe("addComment", () => {
    it("adds a comment and emits sticky:comment-added", () => {
      state.stickies = [makeSticky()];
      const result = stickyService.addComment("s1", { text: "Olá" });
      expect(result.comments).toHaveLength(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:comment-added", result);
    });
  });

  describe("removeComment", () => {
    it("removes the comment and emits sticky:comment-removed", () => {
      state.stickies = [makeSticky({ comments: [{ id: "c1", text: "Olá", createdAt: "2024-01-01T00:00:00.000Z" }] })];
      const result = stickyService.removeComment("s1", "c1");
      expect(result.comments).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:comment-removed", result);
    });
  });

  describe("addImage", () => {
    it("adds an image and emits sticky:image-added", () => {
      state.stickies = [makeSticky()];
      const result = stickyService.addImage("s1", {
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        filename: "foto.png",
        mimeType: "image/png",
        fileSize: 1024
      });
      expect(result.images).toHaveLength(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:image-added", result);
    });
  });

  describe("removeImage", () => {
    it("removes the image and emits sticky:image-removed", () => {
      state.stickies = [makeSticky({ images: [{ id: "i1", dataUrl: "a", filename: "a.png", mimeType: "image/png", fileSize: 1, createdAt: "2024-01-01T00:00:00.000Z" }] })];
      const result = stickyService.removeImage("s1", "i1");
      expect(result.images).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:image-removed", result);
    });
  });

  describe("addAudio", () => {
    it("adds an audio, saves and emits sticky:audio-added", () => {
      state.stickies = [makeSticky()];
      const result = stickyService.addAudio("s1", {
        dataUrl: "data:audio/webm;base64,xx",
        filename: "audio-123.webm",
        mimeType: "audio/webm",
        fileSize: 2048,
        duration: 5
      });
      expect(result.audios).toHaveLength(1);
      expect(state.stickies![0].audios).toHaveLength(1);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:audio-added", result);
    });

    it("throws when sticky not found", () => {
      expect(() => stickyService.addAudio("ghost", {
        dataUrl: "data:audio/webm;base64,xx",
        filename: "a.webm",
        mimeType: "audio/webm",
        fileSize: 1,
        duration: 1
      })).toThrow("Card não encontrado.");
    });
  });

  describe("removeAudio", () => {
    it("removes the audio and emits sticky:audio-removed", () => {
      state.stickies = [makeSticky({ audios: [{ id: "au1", dataUrl: "a", filename: "a.webm", mimeType: "audio/webm", fileSize: 1, duration: 2, createdAt: "2024-01-01T00:00:00.000Z" }] })];
      const result = stickyService.removeAudio("s1", "au1");
      expect(result.audios).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("sticky:audio-removed", result);
    });

    it("throws when sticky not found", () => {
      expect(() => stickyService.removeAudio("ghost", "au1")).toThrow("Card não encontrado.");
    });
  });
});
