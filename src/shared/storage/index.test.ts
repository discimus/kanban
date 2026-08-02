import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { reviveState, normalizeProduct, normalizeBacklogItem, normalizeLink, normalizeImage, normalizeAudioRecording, normalizeSticky, store } from "@shared/storage";
import { emptyState, type Link, type Image, type AudioRecording, type Product, type BacklogItem, type Sticky } from "@shared/types";
import { getBlob, putBlob, clearBlobs } from "./blob-store";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Test Product",
    description: "",
    createdAt: "2024-01-01T00:00:00.000Z",
    status: "backlog",
    showPriority: true,
    category: "development",
    autoArchiveDays: null,
    autoPasteLinks: true,
    autoPasteImages: true,
    showReview: true,
    palette: "indigo" as const,
    archivedAt: null,
    pinnedAt: null,
    ...overrides,
  };
}

function makeBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "b1",
    productId: "p1",
    title: "Test Item",
    description: "",
    priority: "low",
    status: "todo",
    storyPoints: 1,
    classification: "task",
    createdAt: "2024-01-01T00:00:00.000Z",
    archivedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("emptyState", () => {
  it("returns all arrays empty", () => {
    const state = emptyState();
    expect(state.products).toEqual([]);
    expect(state.backlogItems).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.links).toEqual([]);
    expect(state.comments).toEqual([]);
    expect(state.images).toEqual([]);
    expect(state.audios).toEqual([]);
    expect(state.estimations).toEqual([]);
  });
});

describe("reviveState", () => {
  it("returns emptyState() for null", () => {
    expect(reviveState(null)).toEqual(emptyState());
  });

  it("returns emptyState() for undefined", () => {
    expect(reviveState(undefined)).toEqual(emptyState());
  });

  it("returns all empty arrays for empty object", () => {
    expect(reviveState({})).toEqual(emptyState());
  });

  it("fills missing fields with empties for partial state", () => {
    const partial = {
      products: [makeProduct()],
    };
    const result = reviveState(partial);
    expect(result.products).toHaveLength(1);
    expect(result.backlogItems).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.links).toEqual([]);
    expect(result.comments).toEqual([]);
    expect(result.images).toEqual([]);
    expect(result.audios).toEqual([]);
    expect(result.estimations).toEqual([]);
  });

  it("preserves audios through revive", () => {
    const audio = {
      id: "a1",
      backlogItemId: "b1",
      dataUrl: "data:audio/webm;base64,GkXfo0",
      filename: "audio.webm",
      mimeType: "audio/webm",
      fileSize: 2048,
      duration: 12,
      createdAt: "2026-07-13T00:00:00.000Z",
    } as AudioRecording;
    const state = { products: [], backlogItems: [], tasks: [], links: [], comments: [], images: [], audios: [audio], estimations: [] };
    const result = reviveState(state);
    expect(result.audios).toEqual([audio]);
  });

  it("passes through valid state correctly", () => {
    const product = makeProduct();
    const backlogItem = makeBacklogItem();
    const state = {
      products: [product],
      backlogItems: [backlogItem],
      tasks: [],
      links: [],
      estimations: [],
    };
    const result = reviveState(state);
    expect(result.products).toEqual([product]);
    expect(result.backlogItems).toEqual([backlogItem]);
  });

  it("fixes legacy data with missing showPriority and classification", () => {
    const legacyProduct = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
    } as unknown as Product;
    const legacyItem = {
      id: "b1",
      productId: "p1",
      title: "Old Item",
      description: "",
      priority: "low",
      status: "todo",
      storyPoints: 1,
    } as unknown as BacklogItem;

    const state = {
      products: [legacyProduct],
      backlogItems: [legacyItem],
      tasks: [],
      links: [],
      estimations: [],
    };
    const result = reviveState(state);
    expect(result.products[0].showPriority).toBe(true);
    expect(result.backlogItems[0].classification).toBe("task");
  });
});

describe("normalizeProduct", () => {
  it("sets showPriority: true for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.showPriority).toBe(true);
  });

  it("preserves showPriority: false", () => {
    const product = makeProduct({ showPriority: false });
    const result = normalizeProduct(product);
    expect(result.showPriority).toBe(false);
  });

  it("fixes invalid status to 'backlog'", () => {
    const product = makeProduct({ status: "invalid" as never });
    const result = normalizeProduct(product);
    expect(result.status).toBe("backlog");
  });

  it("preserves status 'completed' and adds showPriority: true when missing", () => {
    const legacy = {
      id: "p1",
      name: "Done",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "completed",
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.status).toBe("completed");
    expect(result.showPriority).toBe(true);
  });

  it("defaults category to 'development' when missing", () => {
    const legacy = {
      id: "p1",
      name: "P",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.category).toBe("development");
  });

  it("preserves valid category 'business'", () => {
    const product = makeProduct({ category: "business" });
    const result = normalizeProduct(product);
    expect(result.category).toBe("business");
  });

  it("fixes invalid category to 'development'", () => {
    const product = makeProduct({ category: "invalid" as never });
    const result = normalizeProduct(product);
    expect(result.category).toBe("development");
  });

  it("sets autoArchiveDays to null for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
      category: "development",
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.autoArchiveDays).toBeNull();
  });

  it("sets autoPasteLinks to true for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
      category: "development",
      autoArchiveDays: null,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.autoPasteLinks).toBe(true);
  });

  it("preserves autoPasteLinks: false", () => {
    const product = makeProduct({ autoPasteLinks: false });
    const result = normalizeProduct(product);
    expect(result.autoPasteLinks).toBe(false);
  });

  it("sets showReview to true for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
      category: "development",
      autoArchiveDays: null,
      autoPasteLinks: true,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.showReview).toBe(true);
  });

  it("preserves showReview: false", () => {
    const product = makeProduct({ showReview: false });
    const result = normalizeProduct(product);
    expect(result.showReview).toBe(false);
  });

  it("sets autoPasteImages to true for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
      category: "development",
      autoArchiveDays: null,
      autoPasteLinks: true,
      showReview: true,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.autoPasteImages).toBe(true);
  });

  it("preserves autoPasteImages: false", () => {
    const product = makeProduct({ autoPasteImages: false });
    const result = normalizeProduct(product);
    expect(result.autoPasteImages).toBe(false);
  });

  it("sets pinnedAt to null for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
      category: "development",
      autoArchiveDays: null,
      autoPasteLinks: true,
      autoPasteImages: true,
      showReview: true,
      archivedAt: null,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.pinnedAt).toBeNull();
  });

  it("preserves pinnedAt when set", () => {
    const product = makeProduct({ pinnedAt: "2026-07-14T00:00:00.000Z" });
    const result = normalizeProduct(product);
    expect(result.pinnedAt).toBe("2026-07-14T00:00:00.000Z");
  });

  it("defaults palette to 'indigo' for legacy product without it", () => {
    const legacy = {
      id: "p1",
      name: "Old",
      description: "",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "backlog",
      showPriority: true,
      category: "development",
      autoArchiveDays: null,
      autoPasteLinks: true,
      autoPasteImages: true,
      showReview: true,
      archivedAt: null,
      pinnedAt: null,
    } as unknown as Product;
    const result = normalizeProduct(legacy);
    expect(result.palette).toBe("indigo");
  });

  it("preserves palette when set to a valid value", () => {
    const product = makeProduct({ palette: "teal" });
    const result = normalizeProduct(product);
    expect(result.palette).toBe("teal");
  });

  it("fixes invalid palette to 'indigo'", () => {
    const product = makeProduct({ palette: "invalid" as never });
    const result = normalizeProduct(product);
    expect(result.palette).toBe("indigo");
  });
});

describe("normalizeLink", () => {
  it("sets visitedAt to null for legacy link without it", () => {
    const legacy = {
      id: "l1",
      backlogItemId: "b1",
      url: "https://example.com",
    } as unknown as Link;
    const result = normalizeLink(legacy);
    expect(result.visitedAt).toBeNull();
  });

  it("preserves existing visitedAt", () => {
    const link = {
      id: "l1",
      backlogItemId: "b1",
      url: "https://example.com",
      visitedAt: "2026-07-12T14:30:00.000Z",
    } as Link;
    const result = normalizeLink(link);
    expect(result.visitedAt).toBe("2026-07-12T14:30:00.000Z");
  });

  it("sets visitCount to 0 for legacy unvisited link without it", () => {
    const legacy = {
      id: "l1",
      backlogItemId: "b1",
      url: "https://example.com",
      visitedAt: null,
    } as unknown as Link;
    const result = normalizeLink(legacy);
    expect(result.visitCount).toBe(0);
  });

  it("sets visitCount to 1 for legacy visited link without it", () => {
    const legacy = {
      id: "l1",
      backlogItemId: "b1",
      url: "https://example.com",
      visitedAt: "2026-07-12T14:30:00.000Z",
    } as unknown as Link;
    const result = normalizeLink(legacy);
    expect(result.visitCount).toBe(1);
  });

  it("preserves existing visitCount", () => {
    const link = {
      id: "l1",
      backlogItemId: "b1",
      url: "https://example.com",
      visitedAt: "2026-07-12T14:30:00.000Z",
      visitCount: 7,
    } as Link;
    const result = normalizeLink(link);
    expect(result.visitCount).toBe(7);
  });
});

describe("normalizeBacklogItem", () => {
  it("sets classification: 'task' for legacy backlogItem without it", () => {
    const legacy = {
      id: "b1",
      productId: "p1",
      title: "Old Item",
      description: "",
      priority: "low",
      status: "todo",
      storyPoints: 1,
    } as unknown as BacklogItem;
    const result = normalizeBacklogItem(legacy);
    expect(result.classification).toBe("task");
  });

  it("preserves classification: 'bug'", () => {
    const item = makeBacklogItem({ classification: "bug" });
    const result = normalizeBacklogItem(item);
    expect(result.classification).toBe("bug");
  });

  it("fixes invalid classification to 'task'", () => {
    const item = makeBacklogItem({ classification: "invalid" as never });
    const result = normalizeBacklogItem(item);
    expect(result.classification).toBe("task");
  });

  it("sets completedAt to null for legacy backlogItem without it", () => {
    const legacy = {
      id: "b1",
      productId: "p1",
      title: "Old Item",
      description: "",
      priority: "low",
      status: "todo",
      storyPoints: 1,
      classification: "task",
      archivedAt: null,
    } as unknown as BacklogItem;
    const result = normalizeBacklogItem(legacy);
    expect(result.completedAt).toBeNull();
  });
});

describe("normalizeImage", () => {
  it("sets fileSize to 0 for legacy image without it", () => {
    const legacy = {
      id: "img1",
      backlogItemId: "b1",
      dataUrl: "data:image/png;base64,abc=",
      filename: "foto.png",
      mimeType: "image/png",
      createdAt: "2026-07-13T00:00:00.000Z",
    } as unknown as Image;
    const result = normalizeImage(legacy);
    expect(result.fileSize).toBe(0);
  });

  it("preserves existing fileSize", () => {
    const img = {
      id: "img1",
      backlogItemId: "b1",
      dataUrl: "data:image/png;base64,abc=",
      filename: "foto.png",
      mimeType: "image/png",
      fileSize: 2048,
      createdAt: "2026-07-13T00:00:00.000Z",
    } as Image;
    const result = normalizeImage(img);
    expect(result.fileSize).toBe(2048);
  });
});

describe("normalizeAudioRecording", () => {
  it("sets fileSize and duration to 0 for legacy audio without them", () => {
    const legacy = {
      id: "a1",
      backlogItemId: "b1",
      dataUrl: "data:audio/webm;base64,GkXfo0",
      filename: "audio.webm",
      mimeType: "audio/webm",
      createdAt: "2026-07-13T00:00:00.000Z",
    } as unknown as AudioRecording;
    const result = normalizeAudioRecording(legacy);
    expect(result.fileSize).toBe(0);
    expect(result.duration).toBe(0);
  });

  it("preserves existing fileSize and duration", () => {
    const audio = {
      id: "a1",
      backlogItemId: "b1",
      dataUrl: "data:audio/webm;base64,GkXfo0",
      filename: "audio.webm",
      mimeType: "audio/webm",
      fileSize: 2048,
      duration: 12,
      createdAt: "2026-07-13T00:00:00.000Z",
    } as AudioRecording;
    const result = normalizeAudioRecording(audio);
    expect(result.fileSize).toBe(2048);
    expect(result.duration).toBe(12);
  });
});

describe("normalizeSticky", () => {
  it("defaults missing links/comments/images to empty arrays", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.links).toEqual([]);
    expect(result.comments).toEqual([]);
    expect(result.images).toEqual([]);
  });

  it("sets visitedAt to null for legacy sticky links without it", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [{ id: "l1", url: "https://example.com" }],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.links[0].visitedAt).toBeNull();
  });

  it("sets visitCount to 0 for legacy unvisited sticky link without it", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [{ id: "l1", url: "https://example.com", visitedAt: null }],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.links[0].visitCount).toBe(0);
  });

  it("sets visitCount to 1 for legacy visited sticky link without it", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [{ id: "l1", url: "https://example.com", visitedAt: "2026-07-12T14:30:00.000Z" }],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.links[0].visitCount).toBe(1);
  });

  it("sets fileSize to 0 for legacy sticky images without it", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [],
      comments: [],
      images: [{
        id: "i1",
        dataUrl: "data:image/png;base64,abc=",
        filename: "foto.png",
        mimeType: "image/png",
        createdAt: "2026-07-13T00:00:00.000Z",
      }],
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.images[0].fileSize).toBe(0);
  });

  it("defaults missing title and description to empty strings", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.title).toBe("");
    expect(result.description).toBe("");
  });

  it("preserves existing title and description", () => {
    const sticky = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      title: "Pendências",
      description: "Revisar",
      links: [],
      comments: [],
      images: [],
    } as Sticky;
    const result = normalizeSticky(sticky);
    expect(result.title).toBe("Pendências");
    expect(result.description).toBe("Revisar");
  });

  it("preserves existing visitedAt and fileSize", () => {
    const sticky = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [{ id: "l1", url: "https://example.com", visitedAt: "2026-07-12T14:30:00.000Z" }],
      comments: [],
      images: [{
        id: "i1",
        dataUrl: "data:image/png;base64,abc=",
        filename: "foto.png",
        mimeType: "image/png",
        fileSize: 2048,
        createdAt: "2026-07-13T00:00:00.000Z",
      }],
    } as unknown as Sticky;
    const result = normalizeSticky(sticky);
    expect(result.links[0].visitedAt).toBe("2026-07-12T14:30:00.000Z");
    expect(result.images[0].fileSize).toBe(2048);
  });

  it("preserves existing visitCount on sticky link", () => {
    const sticky = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [{ id: "l1", url: "https://example.com", visitedAt: "2026-07-12T14:30:00.000Z", visitCount: 5 }],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const result = normalizeSticky(sticky);
    expect(result.links[0].visitCount).toBe(5);
  });

  it("preserves sticky audios when present", () => {
    const sticky = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [],
      comments: [],
      images: [],
      audios: [{
        id: "au1",
        dataUrl: "data:audio/webm;base64,xx",
        filename: "a.webm",
        mimeType: "audio/webm",
        fileSize: 2048,
        duration: 5,
        createdAt: "2026-07-13T00:00:00.000Z",
      }],
    } as unknown as Sticky;
    const result = normalizeSticky(sticky);
    expect(result.audios).toHaveLength(1);
    expect(result.audios![0].fileSize).toBe(2048);
    expect(result.audios![0].duration).toBe(5);
  });

  it("leaves audios undefined for legacy stickies without them", () => {
    const legacy = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      links: [],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const result = normalizeSticky(legacy);
    expect(result.audios).toBeUndefined();
  });
});

describe("reviveState with stickies", () => {
  it("restores stickies when present in raw state", () => {
    const sticky = {
      id: "s1",
      productId: "p1",
      createdAt: "2024-01-01T00:00:00.000Z",
      title: "",
      description: "",
      links: [],
      comments: [],
      images: [],
    } as unknown as Sticky;
    const state = { stickies: [sticky] };
    const result = reviveState(state);
    expect(result.stickies).toEqual([sticky]);
  });

  it("defaults stickies to empty array when missing", () => {
    const state = { products: [], backlogItems: [], tasks: [], links: [], comments: [], images: [], estimations: [] };
    const result = reviveState(state);
    expect(result.stickies).toEqual([]);
  });
});

describe("Store blob hydration and persistence", () => {
  function makeImage(overrides: Partial<Image> = {}): Image {
    return {
      id: "img1",
      backlogItemId: "b1",
      dataUrl: "data:image/png;base64,aGVsbG8=",
      filename: "f.png",
      mimeType: "image/png",
      fileSize: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  function makeStickyWithAudio(dataUrl: string): Sticky {
    return {
      id: "s1",
      productId: "p1",
      createdAt: "2026-01-01T00:00:00.000Z",
      title: "",
      description: "",
      links: [],
      comments: [],
      images: [],
      audios: [{
        id: "sau1",
        dataUrl,
        filename: "a.webm",
        mimeType: "audio/webm",
        fileSize: 5,
        duration: 3,
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
    };
  }

  beforeEach(async () => {
    await clearBlobs();
    store.replaceState(emptyState());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("migrates inline dataUrls into the blob store", async () => {
    store.replaceState({ ...emptyState(), images: [makeImage()] });
    const blob = await getBlob("img1");
    expect(blob).not.toBeNull();
    expect(await blob!.text()).toBe("hello");
  });

  it("migrates inline sticky audio dataUrls into the blob store", async () => {
    store.replaceState({ ...emptyState(), stickies: [makeStickyWithAudio("data:audio/webm;base64,aGVsbG8=")] });
    const blob = await getBlob("sau1");
    expect(blob).not.toBeNull();
    expect(await blob!.text()).toBe("hello");
  });

  it("hydrate restores the in-memory dataUrl from IndexedDB", async () => {
    await putBlob("img1", new Blob(["hello"], { type: "image/png" }));
    store.replaceState({ ...emptyState(), images: [makeImage({ dataUrl: "" })] });
    await store.hydrate();
    expect(store.getState().images[0].dataUrl).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("hydrate restores the sticky audio dataUrl from IndexedDB", async () => {
    await putBlob("sau1", new Blob(["hello"], { type: "audio/webm" }));
    store.replaceState({ ...emptyState(), stickies: [makeStickyWithAudio("")] });
    await store.hydrate();
    expect(store.getState().stickies![0].audios![0].dataUrl).toBe("data:audio/webm;base64,aGVsbG8=");
  });

  it("persists a lean state without inline dataUrls", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => void values.set(k, v),
      removeItem: (k: string) => void values.delete(k),
      clear: () => values.clear(),
    });

    store.replaceState({ ...emptyState(), images: [makeImage()] });
    const raw = JSON.parse(values.get("kanban-ddd-state")!);
    expect(raw.images).toHaveLength(1);
    expect(raw.images[0].dataUrl).toBe("");
  });

  it("persists a lean state without inline sticky audio dataUrls", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => void values.set(k, v),
      removeItem: (k: string) => void values.delete(k),
      clear: () => values.clear(),
    });

    store.replaceState({ ...emptyState(), stickies: [makeStickyWithAudio("data:audio/webm;base64,aGVsbG8=")] });
    const raw = JSON.parse(values.get("kanban-ddd-state")!);
    expect(raw.stickies).toHaveLength(1);
    expect(raw.stickies[0].audios).toHaveLength(1);
    expect(raw.stickies[0].audios[0].dataUrl).toBe("");
  });

  it("hydrate keeps the in-memory dataUrl when the blob is missing", async () => {
    store.replaceState({ ...emptyState(), images: [makeImage({ dataUrl: "" })] });
    await store.hydrate();
    expect(store.getState().images[0].dataUrl).toBe("");
  });

  it("hydrate keeps the sticky audio dataUrl empty when the blob is missing", async () => {
    store.replaceState({ ...emptyState(), stickies: [makeStickyWithAudio("")] });
    await store.hydrate();
    expect(store.getState().stickies![0].audios![0].dataUrl).toBe("");
  });
});
