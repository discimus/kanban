import { describe, it, expect } from "vitest";
import type { AppState, BacklogItem, Image, Product } from "@shared/types";
import { getCardsWithImages } from "./storage-usage";

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
    estimations: [],
    ...partial
  };
}

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
