import { AppState, Product, BacklogItem, TaskClassification, emptyState } from "@shared/types";
import { eventBus } from "@shared/events";

const STORAGE_KEY = "kanban-ddd-state";

const VALID_CLASSIFICATIONS: TaskClassification[] = ["task", "bug", "idea", "refactor"];

export function normalizeBacklogItem(item: BacklogItem): BacklogItem {
  if (!VALID_CLASSIFICATIONS.includes(item.classification)) {
    return { ...item, classification: "task" };
  }
  return item;
}

export function reviveState(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Partial<AppState>;
  return {
    products: Array.isArray(data.products) ? data.products.map(normalizeProduct) : base.products,
    backlogItems: Array.isArray(data.backlogItems) ? data.backlogItems.map(normalizeBacklogItem) : base.backlogItems,
    tasks: Array.isArray(data.tasks) ? data.tasks : base.tasks,
    links: Array.isArray(data.links) ? data.links : base.links,
    estimations: Array.isArray(data.estimations) ? data.estimations : base.estimations
  };
}

const VALID_STATUSES = ["backlog", "in_progress", "completed", "canceled"];

export function normalizeProduct(product: Product): Product {
  const normalized: Product = {
    ...product,
    showPriority: product.showPriority !== false
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
