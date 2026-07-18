import { AppState, Product, BacklogItem, Link, TaskClassification, ProductCategory, emptyState } from "@shared/types";
import { eventBus } from "@shared/events";

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
    estimations: Array.isArray(data.estimations) ? data.estimations : base.estimations
  };
}

const VALID_STATUSES = ["backlog", "in_progress", "completed", "canceled"];
const VALID_CATEGORIES: ProductCategory[] = ["development", "business", "study", "notes"];

export function normalizeLink(link: Link): Link {
  return { ...link, visitedAt: (link as any).visitedAt ?? null };
}

export function normalizeProduct(product: Product): Product {
  const normalized: Product = {
    ...product,
    showPriority: product.showPriority !== false,
    category: VALID_CATEGORIES.includes(product.category) ? product.category : "development",
    autoArchiveDays: (product as any).autoArchiveDays ?? null,
    autoPasteLinks: (product as any).autoPasteLinks !== false,
    showReview: (product as any).showReview !== false,
    archivedAt: (product as any).archivedAt ?? null
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }

  getState(): AppState {
    return this.state;
  }

  /**
   * Mutates the state via a recipe, then persists automatically and
   * notifies subscribers through the shared event bus.
   */
  update(recipe: (state: AppState) => void): void {
    recipe(this.state);
    this.persist();
    eventBus.emit("state:changed");
  }

  reset(): void {
    this.state = emptyState();
    this.persist();
    eventBus.emit("state:changed");
  }

  replaceState(newState: AppState): void {
    this.state = reviveState(newState);
    this.persist();
    eventBus.emit("state:changed");
  }
}

export const store = new Store();
