import { BacklogItem, KanbanStatus, Priority, TaskClassification, ProductCategory, CATEGORY_CLASSIFICATIONS } from "@shared/types";
import { uuid } from "@shared/utils";

export interface CreateBacklogItemProps {
  productId: string;
  title: string;
  description?: string;
  priority?: Priority;
  storyPoints?: number;
  classification?: TaskClassification;
}

export function createBacklogItem(props: CreateBacklogItemProps): BacklogItem {
  const title = props.title?.trim();
  if (!props.productId) throw new Error("O item precisa pertencer a um Projeto.");
  if (!title) throw new Error("O título do item é obrigatório.");
  return {
    id: uuid(),
    productId: props.productId,
    title,
    description: props.description?.trim() ?? "",
    priority: props.priority ?? "medium",
    status: "todo",
    storyPoints: Math.max(0, props.storyPoints ?? 0),
    classification: props.classification ?? "task",
    createdAt: new Date().toISOString(),
    archivedAt: null,
    completedAt: null
  };
}

export function isValidTransition(from: KanbanStatus, to: KanbanStatus): boolean {
  const order: KanbanStatus[] = ["todo", "doing", "review", "done"];
  return order.includes(from) && order.includes(to);
}

export function archive(item: BacklogItem, now: string): BacklogItem {
  return { ...item, archivedAt: now };
}

export function restore(item: BacklogItem): BacklogItem {
  return { ...item, archivedAt: null };
}

export function defaultClassificationForCategory(category: ProductCategory): TaskClassification {
  return CATEGORY_CLASSIFICATIONS[category][0].value;
}

export function changeProduct(item: BacklogItem, newProductId: string, classification?: TaskClassification): BacklogItem {
  if (!newProductId) throw new Error("O Projeto de destino é obrigatório.");
  return {
    ...item,
    productId: newProductId,
    status: "todo",
    classification: classification ?? item.classification,
    archivedAt: null,
    completedAt: null
  };
}
