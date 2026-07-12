export type ID = string;
export type ISODate = string;

export type KanbanStatus = "todo" | "doing" | "review" | "done";

export const KANBAN_COLUMNS: { status: KanbanStatus; label: string }[] = [
  { status: "todo", label: "Todo" },
  { status: "doing", label: "Doing" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" }
];

export type Priority = "low" | "medium" | "high" | "critical";

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" }
];

export type TaskClassification = "task" | "bug" | "idea" | "refactor";

export const TASK_CLASSIFICATIONS: { value: TaskClassification; label: string; icon: string }[] = [
  { value: "task", label: "Tarefa", icon: "task" },
  { value: "bug", label: "Bug", icon: "bug_report" },
  { value: "idea", label: "Idealização", icon: "lightbulb" },
  { value: "refactor", label: "Refatoração", icon: "code" }
];

export type TaskStatus = "todo" | "doing" | "done";

export type ProductStatus = "backlog" | "in_progress" | "completed" | "canceled";

export const PRODUCT_STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "canceled", label: "Cancelado" }
];

export interface Product {
  id: ID;
  name: string;
  description: string;
  createdAt: ISODate;
  status: ProductStatus;
  showPriority: boolean;
}

export interface BacklogItem {
  id: ID;
  productId: ID;
  title: string;
  description: string;
  priority: Priority;
  status: KanbanStatus;
  storyPoints: number;
  classification: TaskClassification;
}

export interface Task {
  id: ID;
  backlogItemId: ID;
  title: string;
  status: TaskStatus;
  assignedTo: string;
}

export interface Link {
  id: ID;
  backlogItemId: ID;
  url: string;
}

export interface EstimationLog {
  id: ID;
  taskId: ID;
  estimate: number;
  createdAt: ISODate;
  comment: string;
}

export interface AppState {
  products: Product[];
  backlogItems: BacklogItem[];
  tasks: Task[];
  links: Link[];
  estimations: EstimationLog[];
}

export function emptyState(): AppState {
  return {
    products: [],
    backlogItems: [],
    tasks: [],
    links: [],
    estimations: []
  };
}
