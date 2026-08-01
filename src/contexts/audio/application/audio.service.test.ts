import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState } from "@shared/types";

const { state, mockStore, mockEventBus } = vi.hoisted(() => {
  const state: AppState = { products: [], backlogItems: [], tasks: [], links: [], comments: [], images: [], audios: [], estimations: [] };
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

import { audioService } from "@contexts/audio/application/audio.service";

function makeAudio(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    backlogItemId: "b1",
    dataUrl: "data:audio/webm;base64,GkXfo0",
    filename: "audio.webm",
    mimeType: "audio/webm",
    fileSize: 1024,
    duration: 10,
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
  state.images.length = 0;
  state.audios.length = 0;
  state.estimations.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

describe("audioService", () => {
  describe("byBacklogItem", () => {
    it("filters audios by backlogItemId", () => {
      const a1 = makeAudio({ id: "a1", backlogItemId: "b1" });
      const a2 = makeAudio({ id: "a2", backlogItemId: "b2" });
      state.audios = [a1, a2];
      expect(audioService.byBacklogItem("b1")).toEqual([a1]);
    });
  });

  describe("create", () => {
    it("adds audio and emits audio:created", () => {
      const result = audioService.create({
        backlogItemId: "b1",
        dataUrl: "data:audio/webm;base64,GkXfo0",
        filename: "audio.webm",
        mimeType: "audio/webm",
        fileSize: 1024,
        duration: 8
      });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("audio:created", result);
      expect(state.audios).toHaveLength(1);
    });
  });

  describe("delete", () => {
    it("removes audio and emits audio:deleted", () => {
      state.audios = [makeAudio()];
      audioService.delete("a1");
      expect(state.audios).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("audio:deleted", "a1");
    });
  });
});
