import { describe, it, expect, beforeEach } from "vitest";
import type { AppState, BacklogItem, Image, Product, AudioRecording } from "@shared/types";
import { emptyState } from "@shared/types";
import { store } from "@shared/storage";
import { getCardsWithImages, getCardsWithMedia, getStorageUsage, ensureStorageQuotaLoaded, isStorageQuotaLoaded } from "./storage-usage";

function makeProduct(id: string, name: string, overrides: Record<string, unknown> = {}): Product {
  return {
    id,
    name,
    description: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "backlog",
    showPriority: true,
    category: "development",
    autoArchiveDays: null,
    autoPasteLinks: true,
    autoPasteImages: true,
    showReview: true,
    palette: "indigo",
    archivedAt: null,
    pinnedAt: null,
    ...overrides
  };
}

function makeItem(id: string, productId: string, overrides: Record<string, unknown> = {}): BacklogItem {
  return {
    id,
    productId,
    title: `Card ${id}`,
    description: "",
    priority: "medium",
    status: "todo",
    storyPoints: 0,
    classification: "task",
    createdAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    completedAt: null,
    ...overrides
  };
}

function makeImage(id: string, backlogItemId: string, overrides: Record<string, unknown> = {}): Image {
  return {
    id,
    backlogItemId,
    dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    filename: `${id}.png`,
    mimeType: "image/png",
    fileSize: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function makeState(partial: Partial<AppState> = {}): AppState {
  return {
    products: [],
    backlogItems: [],
    tasks: [],
    links: [],
    comments: [],
    images: [],
    audios: [],
    estimations: [],
    ...partial
  };
}

function makeAudio(id: string, backlogItemId: string, overrides: Record<string, unknown> = {}): AudioRecording {
  return {
    id,
    backlogItemId,
    dataUrl: "data:audio/webm;base64,GkXfo0",
    filename: `${id}.webm`,
    mimeType: "audio/webm",
    fileSize: 2048,
    duration: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(() => {
  store.replaceState(emptyState());
});

describe("getCardsWithImages", () => {
  it("returns cards that have at least one image", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1"), makeItem("b2", "p1")],
      images: [makeImage("img1", "b1")]
    });

    const result = getCardsWithImages(state);

    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe("b1");
    expect(result[0].product.id).toBe("p1");
    expect(result[0].images).toHaveLength(1);
  });

  it("excludes cards without images", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1")],
      images: []
    });

    expect(getCardsWithImages(state)).toEqual([]);
  });

  it("excludes archived cards", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1", { archivedAt: "2026-02-01T00:00:00.000Z" })],
      images: [makeImage("img1", "b1")]
    });

    expect(getCardsWithImages(state)).toEqual([]);
  });

  it("excludes cards whose product is archived", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha", { archivedAt: "2026-02-01T00:00:00.000Z" })],
      backlogItems: [makeItem("b1", "p1")],
      images: [makeImage("img1", "b1")]
    });

    expect(getCardsWithImages(state)).toEqual([]);
  });

  it("excludes orphan cards without a matching product", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "missing")],
      images: [makeImage("img1", "b1")]
    });

    expect(getCardsWithImages(state)).toEqual([]);
  });

  it("sorts by product name then by most recent card", () => {
    const state = makeState({
      products: [makeProduct("p1", "Beta"), makeProduct("p2", "Alpha")],
      backlogItems: [
        makeItem("old", "p2", { createdAt: "2026-01-01T00:00:00.000Z" }),
        makeItem("new", "p2", { createdAt: "2026-06-01T00:00:00.000Z" }),
        makeItem("b3", "p1", { createdAt: "2026-03-01T00:00:00.000Z" })
      ],
      images: [
        makeImage("img1", "old"),
        makeImage("img2", "new"),
        makeImage("img3", "b3")
      ]
    });

    const result = getCardsWithImages(state);

    expect(result.map((e) => `${e.product.name}/${e.item.id}`)).toEqual([
      "Alpha/new",
      "Alpha/old",
      "Beta/b3"
    ]);
  });

  it("groups every image belonging to the card", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1")],
      images: [makeImage("img1", "b1"), makeImage("img2", "b1")]
    });

    const result = getCardsWithImages(state);

    expect(result[0].images.map((i) => i.id)).toEqual(["img1", "img2"]);
  });
});

describe("getStorageUsage", () => {
  it("counts audio bytes into usedBytes", () => {
    const base = getStorageUsage();
    store.replaceState(makeState({ audios: [makeAudio("a1", "b1")] }));
    const usage = getStorageUsage();
    expect(usage.usedBytes - base.usedBytes).toBeGreaterThanOrEqual(2048);
  });

  it("counts no audio bytes when there are no audios", () => {
    const usage = getStorageUsage();
    expect(usage.usedBytes).toBeGreaterThan(0);
  });
});

describe("storage quota caching", () => {
  it("reports quota not loaded initially", () => {
    expect(isStorageQuotaLoaded()).toBe(false);
  });

  it("resolves false when the Storage API is unavailable", async () => {
    await expect(ensureStorageQuotaLoaded()).resolves.toBe(false);
    expect(isStorageQuotaLoaded()).toBe(false);
  });
});

describe("getCardsWithMedia", () => {
  it("returns cards with images when type is images", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1")],
      images: [makeImage("img1", "b1")]
    });

    const result = getCardsWithMedia(state, "images");

    expect(result).toHaveLength(1);
    expect(result[0].images).toHaveLength(1);
    expect(result[0].audios).toHaveLength(0);
  });

  it("returns cards with audios when type is audio", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1")],
      audios: [makeAudio("a1", "b1")]
    });

    const result = getCardsWithMedia(state, "audio");

    expect(result).toHaveLength(1);
    expect(result[0].audios).toHaveLength(1);
    expect(result[0].images).toHaveLength(0);
  });

  it("includes cards with either kind when type is all", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1"), makeItem("b2", "p1"), makeItem("b3", "p1")],
      images: [makeImage("img1", "b1")],
      audios: [makeAudio("a1", "b2")]
    });

    const result = getCardsWithMedia(state, "all");

    expect(result.map((e) => e.item.id).sort()).toEqual(["b1", "b2"]);
  });

  it("excludes cards that match no requested type", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1")],
      images: [makeImage("img1", "b1")]
    });

    expect(getCardsWithMedia(state, "audio")).toEqual([]);
    expect(getCardsWithMedia(state, "images")).toHaveLength(1);
  });

  it("excludes archived cards and archived products", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha", { archivedAt: "2026-02-01T00:00:00.000Z" })],
      backlogItems: [makeItem("b1", "p1", { archivedAt: "2026-02-01T00:00:00.000Z" })],
      images: [makeImage("img1", "b1")],
      audios: [makeAudio("a1", "b1")]
    });

    expect(getCardsWithMedia(state, "all")).toEqual([]);
  });

  it("excludes orphan cards without a matching product", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "missing")],
      images: [makeImage("img1", "b1")]
    });

    expect(getCardsWithMedia(state, "all")).toEqual([]);
  });

  it("sorts by product name then most recent card", () => {
    const state = makeState({
      products: [makeProduct("p1", "Beta"), makeProduct("p2", "Alpha")],
      backlogItems: [
        makeItem("old", "p2", { createdAt: "2026-01-01T00:00:00.000Z" }),
        makeItem("new", "p2", { createdAt: "2026-06-01T00:00:00.000Z" }),
        makeItem("b3", "p1", { createdAt: "2026-03-01T00:00:00.000Z" })
      ],
      images: [makeImage("img1", "old"), makeImage("img2", "new")],
      audios: [makeAudio("a1", "b3")]
    });

    const result = getCardsWithMedia(state, "all");

    expect(result.map((e) => `${e.product.name}/${e.item.id}`)).toEqual([
      "Alpha/new",
      "Alpha/old",
      "Beta/b3"
    ]);
  });

  it("groups every image and audio belonging to the card", () => {
    const state = makeState({
      products: [makeProduct("p1", "Alpha")],
      backlogItems: [makeItem("b1", "p1")],
      images: [makeImage("img1", "b1"), makeImage("img2", "b1")],
      audios: [makeAudio("a1", "b1"), makeAudio("a2", "b1")]
    });

    const result = getCardsWithMedia(state, "all");

    expect(result).toHaveLength(1);
    expect(result[0].images.map((i) => i.id)).toEqual(["img1", "img2"]);
    expect(result[0].audios.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});
