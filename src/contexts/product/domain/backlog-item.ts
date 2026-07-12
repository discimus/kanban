import { BacklogItem, KanbanStatus, Priority, TaskClassification } from "@shared/types";
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
    classification: props.classification ?? "task"
  };
}

export function isValidTransition(from: KanbanStatus, to: KanbanStatus): boolean {
  const order: KanbanStatus[] = ["todo", "doing", "review", "done"];
  return order.includes(from) && order.includes(to);
}
