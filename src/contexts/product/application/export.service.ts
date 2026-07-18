import { store, normalizeLink, normalizeBacklogItem } from "@shared/storage";
import { AppState, Product, BacklogItem, Task, Link, Comment, EstimationLog, TaskClassification, ProductCategory } from "@shared/types";

const VALID_PRODUCT_STATUSES = ["backlog", "in_progress", "completed", "canceled"];
const VALID_KANBAN_STATUSES = ["todo", "doing", "review", "done"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_TASK_STATUSES = ["todo", "doing", "done"];
const VALID_CLASSIFICATIONS: TaskClassification[] = ["task", "bug", "refactor", "idea", "pending", "improvement", "meeting", "content", "project", "note", "exercise", "todo"];
const VALID_CATEGORIES: ProductCategory[] = ["development", "business", "study", "notes"];

interface ExportResult {
  success: boolean;
  error?: string;
}

function formatDateLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "-").slice(0, 64) || "projeto";
}

export function exportAllState(): AppState {
  return store.getState();
}

export function exportProductState(productId: string): AppState | null {
  const state = store.getState();
  const product = state.products.find((p) => p.id === productId);
  if (!product) return null;

  const backlogItems = state.backlogItems.filter((bi) => bi.productId === productId);
  const backlogItemIds = new Set(backlogItems.map((bi) => bi.id));
  const tasks = state.tasks.filter((t) => backlogItemIds.has(t.backlogItemId));
  const links = state.links.filter((l) => backlogItemIds.has(l.backlogItemId));
  const taskIds = new Set(tasks.map((t) => t.id));
  const comments = state.comments.filter((c) => backlogItemIds.has(c.backlogItemId));
  const estimations = state.estimations.filter((e) => taskIds.has(e.taskId));

  return {
    products: [product],
    backlogItems,
    tasks,
    links,
    comments,
    images: [],
    estimations
  };
}

export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadExportAll(): void {
  const state = exportAllState();
  const json = JSON.stringify(state, null, 2);
  downloadFile(json, `kanban-export-${formatDateLabel()}.json`);
}

export function downloadExportProduct(productName: string, productId: string): void {
  const state = exportProductState(productId);
  if (!state) return;
  const json = JSON.stringify(state, null, 2);
  const safeName = sanitizeFilename(productName);
  downloadFile(json, `${safeName}-${formatDateLabel()}.json`);
}

export function checkImportConflicts(jsonString: string): { hasConflicts: boolean; conflicting: { id: string; name: string }[] } {
  let data: unknown;
  try { data = JSON.parse(jsonString); } catch { return { hasConflicts: false, conflicting: [] }; }
  if (!data || typeof data !== "object") return { hasConflicts: false, conflicting: [] };
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.products)) return { hasConflicts: false, conflicting: [] };

  const state = store.getState();
  const conflicting = (obj.products as Product[]).filter((p) =>
    state.products.some((existing) => existing.id === p.id)
  ).map((p) => ({ id: p.id, name: p.name }));

  return { hasConflicts: conflicting.length > 0, conflicting };
}

export function openImportPicker(onFile: (content: string) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const text = reader.result as string;
      onFile(text);
    });
    reader.readAsText(file);
  });
  input.click();
}

export function validateAndImport(jsonString: string, overwrite = false): ExportResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { success: false, error: "Arquivo JSON inválido." };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "O arquivo não contém um objeto JSON válido." };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.products)) {
    return { success: false, error: 'O JSON deve conter um array "products".' };
  }

  for (const p of obj.products as Product[]) {
    if (!p.id || typeof p.id !== "string") return { success: false, error: "Cada produto precisa de um id válido (string)." };
    if (!p.name || typeof p.name !== "string") return { success: false, error: "Cada produto precisa de um name (string)." };
    if (!p.createdAt || typeof p.createdAt !== "string") return { success: false, error: "Cada produto precisa de createdAt (string ISO)." };
    if (!VALID_PRODUCT_STATUSES.includes(p.status)) {
      return { success: false, error: `Status inválido no produto "${p.name}": ${p.status}. Valores válidos: ${VALID_PRODUCT_STATUSES.join(", ")}` };
    }
    if (p.category && !VALID_CATEGORIES.includes(p.category as ProductCategory)) {
      return { success: false, error: `Categoria inválida no produto "${p.name}": ${p.category}. Valores válidos: ${VALID_CATEGORIES.join(", ")}` };
    }
  }

  if (obj.backlogItems !== undefined && !Array.isArray(obj.backlogItems)) {
    return { success: false, error: '"backlogItems" deve ser um array.' };
  }
  if (Array.isArray(obj.backlogItems)) {
    for (const bi of obj.backlogItems as BacklogItem[]) {
      if (!bi.id || !bi.productId || !bi.title) return { success: false, error: "Cada backlogItem precisa de id, productId e title." };
      if (!VALID_KANBAN_STATUSES.includes(bi.status)) {
        return { success: false, error: `Status kanban inválido no item "${bi.title}": ${bi.status}.` };
      }
      if (!VALID_PRIORITIES.includes(bi.priority)) {
        return { success: false, error: `Prioridade inválida no item "${bi.title}": ${bi.priority}.` };
      }
      if (bi.classification && !VALID_CLASSIFICATIONS.includes(bi.classification as TaskClassification)) {
        return { success: false, error: `Classificação inválida no item "${bi.title}": ${bi.classification}. Valores válidos: ${VALID_CLASSIFICATIONS.join(", ")}` };
      }
    }
  }

  if (obj.tasks !== undefined && !Array.isArray(obj.tasks)) {
    return { success: false, error: '"tasks" deve ser um array.' };
  }
  if (Array.isArray(obj.tasks)) {
    for (const t of obj.tasks as Task[]) {
      if (!t.id || !t.backlogItemId || !t.title) return { success: false, error: "Cada task precisa de id, backlogItemId e title." };
      if (!VALID_TASK_STATUSES.includes(t.status)) {
        return { success: false, error: `Status inválido na task "${t.title}": ${t.status}.` };
      }
    }
  }

  if (obj.links !== undefined && !Array.isArray(obj.links)) {
    return { success: false, error: '"links" deve ser um array.' };
  }
  if (Array.isArray(obj.links)) {
    for (const l of obj.links as Link[]) {
      if (!l.id || !l.backlogItemId || !l.url) return { success: false, error: "Cada link precisa de id, backlogItemId e url." };
    }
  }

  if (obj.comments !== undefined && !Array.isArray(obj.comments)) {
    return { success: false, error: '"comments" deve ser um array.' };
  }
  if (Array.isArray(obj.comments)) {
    for (const c of obj.comments as Comment[]) {
      if (!c.id || !c.backlogItemId || !c.text) return { success: false, error: "Cada comment precisa de id, backlogItemId e text." };
    }
  }

  if (obj.estimations !== undefined && !Array.isArray(obj.estimations)) {
    return { success: false, error: '"estimations" deve ser um array.' };
  }
  if (Array.isArray(obj.estimations)) {
    for (const e of obj.estimations as EstimationLog[]) {
      if (!e.id || !e.taskId || typeof e.estimate !== "number") return { success: false, error: "Cada estimation precisa de id, taskId e estimate (number)." };
    }
  }

  doImport(data as AppState, overwrite);
  return { success: true };
}

function doImport(data: AppState, overwrite = false): void {
  store.update((state) => {
    if (overwrite) {
      for (const product of data.products) {
        if (state.products.some((p) => p.id === product.id)) {
          const removedItems = state.backlogItems.filter((b) => b.productId === product.id).map((b) => b.id);
          state.backlogItems = state.backlogItems.filter((b) => b.productId !== product.id);
          const removedTasks = state.tasks.filter((t) => removedItems.includes(t.backlogItemId)).map((t) => t.id);
          state.tasks = state.tasks.filter((t) => !removedItems.includes(t.backlogItemId));
          state.links = state.links.filter((l) => !removedItems.includes(l.backlogItemId));
          state.comments = state.comments.filter((c) => !removedItems.includes(c.backlogItemId));
          state.estimations = state.estimations.filter((e) => !removedTasks.includes(e.taskId));
          state.products = state.products.filter((p) => p.id !== product.id);
        }
      }
    }
    for (const product of data.products) {
      if (!state.products.some((p) => p.id === product.id)) {
        state.products.push(product);
      }
    }
    for (const bi of data.backlogItems) {
      if (!state.backlogItems.some((b) => b.id === bi.id)) {
        state.backlogItems.push(normalizeBacklogItem(bi));
      }
    }
    for (const task of data.tasks) {
      if (!state.tasks.some((t) => t.id === task.id)) {
        state.tasks.push(task);
      }
    }
    for (const link of data.links) {
      if (!state.links.some((l) => l.id === link.id)) {
        state.links.push(normalizeLink(link));
      }
    }
    if (Array.isArray(data.comments)) {
      for (const comment of data.comments) {
        if (!state.comments.some((c) => c.id === comment.id)) {
          state.comments.push(comment);
        }
      }
    }
    for (const est of data.estimations) {
      if (!state.estimations.some((e) => e.id === est.id)) {
        state.estimations.push(est);
      }
    }
  });
}
