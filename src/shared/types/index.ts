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

export type TaskStatus = "todo" | "doing" | "done";

export interface Product {
  id: ID;
  name: string;
  description: string;
  createdAt: ISODate;
}

export interface BacklogItem {
  id: ID;
  productId: ID;
  title: string;
  description: string;
  priority: Priority;
  status: KanbanStatus;
  storyPoints: number;
}

export interface Task {
  id: ID;
  backlogItemId: ID;
  title: string;
  status: TaskStatus;
  assignedTo: string;
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
  estimations: EstimationLog[];
}

export function emptyState(): AppState {
  return {
    products: [],
    backlogItems: [],
    tasks: [],
    estimations: []
  };
}
