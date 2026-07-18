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

import { imageService } from "@contexts/image/application/image.service";

function makeImage(overrides: Record<string, unknown> = {}) {
  return {
    id: "img1",
    backlogItemId: "b1",
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    filename: "foto.png",
    mimeType: "image/png",
    fileSize: 1024,
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
  state.estimations.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

describe("imageService", () => {
  describe("byBacklogItem", () => {
    it("filters images by backlogItemId", () => {
      const img1 = makeImage({ id: "img1", backlogItemId: "b1" });
      const img2 = makeImage({ id: "img2", backlogItemId: "b2" });
      state.images = [img1, img2];
      expect(imageService.byBacklogItem("b1")).toEqual([img1]);
    });
  });

  describe("create", () => {
    it("adds image and emits image:created", () => {
      const result = imageService.create({
        backlogItemId: "b1",
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        filename: "foto.png",
        mimeType: "image/png",
        fileSize: 1024
      });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("image:created", result);
      expect(state.images).toHaveLength(1);
    });
  });

  describe("delete", () => {
    it("removes image and emits image:deleted", () => {
      state.images = [makeImage()];
      imageService.delete("img1");
      expect(state.images).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("image:deleted", "img1");
    });
  });
});
