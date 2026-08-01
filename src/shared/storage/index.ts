import { AppState, Product, BacklogItem, Link, Image, AudioRecording, Sticky, TaskClassification, ProductCategory, PaletteId, PALETTES, emptyState } from "@shared/types";
import { eventBus } from "@shared/events";
import { putBlob, getBlob, deleteBlob, clearBlobs, getAllBlobKeys, dataUrlToBlob, blobToDataUrl } from "./blob-store";

const STORAGE_KEY = "kanban-ddd-state";

const VALID_CLASSIFICATIONS: TaskClassification[] = ["task", "bug", "refactor", "idea", "pending", "improvement", "meeting", "content", "project", "note", "exercise", "todo"];

export function normalizeBacklogItem(item: BacklogItem): BacklogItem {
  const base: BacklogItem = { ...item, archivedAt: (item as any).archivedAt ?? null, completedAt: (item as any).completedAt ?? null, createdAt: (item as any).createdAt ?? new Date().toISOString() };
  if (!VALID_CLASSIFICATIONS.includes(item.classification)) {
    return { ...base, classification: "task" };
  }
  return base;
}

export function reviveState(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<AppState>;
  return {
    products: Array.isArray(data.products) ? data.products.map(normalizeProduct) : base.products,
    backlogItems: Array.isArray(data.backlogItems) ? data.backlogItems.map(normalizeBacklogItem) : base.backlogItems,
    tasks: Array.isArray(data.tasks) ? data.tasks : base.tasks,
    links: Array.isArray(data.links) ? data.links.map(normalizeLink) : base.links,
    comments: Array.isArray(data.comments) ? data.comments : base.comments,
    images: Array.isArray(data.images) ? data.images.map(normalizeImage) : base.images,
    audios: Array.isArray(data.audios) ? data.audios.map(normalizeAudioRecording) : base.audios,
    estimations: Array.isArray(data.estimations) ? data.estimations : base.estimations,
    stickies: Array.isArray(data.stickies) ? data.stickies.map(normalizeSticky) : base.stickies
  };
}

export function normalizeSticky(sticky: Sticky): Sticky {
  return {
    ...sticky,
    title: (sticky as any).title ?? "",
    description: (sticky as any).description ?? "",
    links: Array.isArray((sticky as any).links) ? (sticky as any).links.map((l: Sticky["links"][number]) => ({ ...l, visitedAt: (l as any).visitedAt ?? null, visitCount: (l as any).visitCount ?? ((l as any).visitedAt ? 1 : 0) })) : [],
    comments: Array.isArray((sticky as any).comments) ? (sticky as any).comments : [],
    images: Array.isArray((sticky as any).images) ? (sticky as any).images.map((img: Sticky["images"][number]) => ({ ...img, fileSize: (img as any).fileSize ?? 0 })) : []
  };
}

const VALID_STATUSES = ["backlog", "in_progress", "completed", "canceled"];
const VALID_CATEGORIES: ProductCategory[] = ["development", "business", "study", "notes"];

export function normalizeLink(link: Link): Link {
  return { ...link, visitedAt: (link as any).visitedAt ?? null, visitCount: (link as any).visitCount ?? ((link as any).visitedAt ? 1 : 0) };
}

export function normalizeImage(image: Image): Image {
  return { ...image, fileSize: (image as any).fileSize ?? 0 };
}

export function normalizeAudioRecording(audio: AudioRecording): AudioRecording {
  return { ...audio, fileSize: (audio as any).fileSize ?? 0, duration: (audio as any).duration ?? 0 };
}

export function normalizeProduct(product: Product): Product {
  const validPaletteIds = PALETTES.map(p => p.id);
  const palette = (product as any).palette;
  const normalized: Product = {
    ...product,
    showPriority: product.showPriority !== false,
    category: VALID_CATEGORIES.includes(product.category) ? product.category : "development",
    autoArchiveDays: (product as any).autoArchiveDays ?? null,
    autoPasteLinks: (product as any).autoPasteLinks !== false,
    autoPasteImages: (product as any).autoPasteImages !== false,
    showReview: (product as any).showReview !== false,
    palette: palette && validPaletteIds.includes(palette) ? (palette as PaletteId) : "indigo",
    archivedAt: (product as any).archivedAt ?? null,
    pinnedAt: (product as any).pinnedAt ?? null
  };
  if (!VALID_STATUSES.includes(normalized.status)) {
    return { ...normalized, status: normalized.status === "completed" ? "completed" : "backlog" };
  }
  return normalized;
}

/**
 * Single source of truth. Holds the whole AppState in memory and
 * persists it as one object in localStorage (per spec "Persistência").
 */
class Store {
  private state: AppState;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounce window in ms. Keeps JSON.stringify off the hot path when
   *  multiple mutations fire in the same JS task (e.g. bulk imports, filters). */
  private static readonly PERSIST_DEBOUNCE_MS = 300;

  constructor() {
    this.state = this.load();
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return reviveState(JSON.parse(raw));
    } catch {
      return emptyState();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toLeanState(this.state)));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }

  /** Strips heavy base64 payloads out of the persisted JSON. Blobs live in IndexedDB. */
  private toLeanState(state: AppState): AppState {
    return {
      ...state,
      images: state.images.map((img) => ({ ...img, dataUrl: "" })),
      audios: state.audios.map((a) => ({ ...a, dataUrl: "" }))
    };
  }

  /** Idempotently moves inline blobs into IndexedDB and deletes orphaned ones. */
  private async reconcileBlobs(): Promise<void> {
    const keep = new Set<string>([
      ...this.state.images.map((i) => i.id),
      ...this.state.audios.map((a) => a.id)
    ]);
    for (const img of this.state.images) {
      if (img.dataUrl.startsWith("data:")) await putBlob(img.id, dataUrlToBlob(img.dataUrl));
    }
    for (const a of this.state.audios) {
      if (a.dataUrl.startsWith("data:")) await putBlob(a.id, dataUrlToBlob(a.dataUrl));
    }
    const keys = await getAllBlobKeys();
    for (const k of keys) {
      if (!keep.has(k)) await deleteBlob(k);
    }
  }

  /**
   * Called once at boot: migrates any inline blobs left by older versions,
   * then restores the in-memory `dataUrl` payloads from IndexedDB. No-op when
   * IndexedDB is unavailable (blobs stay in memory only).
   */
  async hydrate(): Promise<void> {
    await this.reconcileBlobs();
    const ids = [...this.state.images.map((i) => i.id), ...this.state.audios.map((a) => a.id)];
    const restored = await Promise.all(ids.map(async (id) => {
      const blob = await getBlob(id);
      return blob ? { id, dataUrl: await blobToDataUrl(blob) } : null;
    }));
    const byId = new Map(restored.filter((r): r is { id: string; dataUrl: string } => r !== null).map((r) => [r.id, r.dataUrl]));
    for (const img of this.state.images) {
      const url = byId.get(img.id);
      if (url) img.dataUrl = url;
    }
    for (const a of this.state.audios) {
      const url = byId.get(a.id);
      if (url) a.dataUrl = url;
    }
  }

  /** Schedules a persist, coalescing rapid successive mutations into one write. */
  private schedulePersist(): void {
    if (this.persistTimer !== null) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persist();
    }, Store.PERSIST_DEBOUNCE_MS);
  }

  getState(): AppState {
    return this.state;
  }

  /**
   * Mutates the state via a recipe, schedules a debounced persist, and
   * notifies subscribers through the shared event bus.
   */
  update(recipe: (state: AppState) => void): void {
    recipe(this.state);
    this.schedulePersist();
    eventBus.emit("state:changed");
  }

  reset(): void {
    this.state = emptyState();
    this.persist();
    void clearBlobs();
    eventBus.emit("state:changed");
  }

  replaceState(newState: AppState): void {
    this.state = reviveState(newState);
    this.persist();
    void this.reconcileBlobs();
    eventBus.emit("state:changed");
  }

  /** Flushes any pending debounced persist immediately.
   *  Useful for tests and for beforeunload safety. */
  flushPersist(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
      this.persist();
    }
  }
}

export const store = new Store();
