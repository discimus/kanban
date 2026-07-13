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

export type TaskClassification = "task" | "bug" | "refactor" | "idea" | "pending" | "improvement" | "meeting" | "content" | "project" | "note" | "exercise";

export type ProductCategory = "development" | "business" | "study";

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; icon: string }[] = [
  { value: "development", label: "Desenvolvimento", icon: "code" },
  { value: "business", label: "Negócios", icon: "business_center" },
  { value: "study", label: "Estudo", icon: "school" }
];

export const CATEGORY_CLASSIFICATIONS: Record<ProductCategory, { value: TaskClassification; label: string; icon: string }[]> = {
  development: [
    { value: "task", label: "Tarefa", icon: "task" },
    { value: "bug", label: "Bug", icon: "bug_report" },
    { value: "refactor", label: "Refatoração", icon: "code" },
    { value: "idea", label: "Idealização", icon: "lightbulb" }
  ],
  business: [
    { value: "task", label: "Tarefa", icon: "task" },
    { value: "pending", label: "Pendência", icon: "pending" },
    { value: "improvement", label: "Melhoria", icon: "trending_up" },
    { value: "meeting", label: "Reunião", icon: "groups" }
  ],
  study: [
    { value: "task", label: "Tarefa", icon: "task" },
    { value: "content", label: "Conteúdo", icon: "menu_book" },
    { value: "project", label: "Projeto", icon: "build" },
    { value: "note", label: "Anotação", icon: "sticky_note_2" },
    { value: "exercise", label: "Exercício", icon: "fitness_center" }
  ]
};

export const TASK_CLASSIFICATIONS: { value: TaskClassification; label: string; icon: string }[] = [
  { value: "task", label: "Tarefa", icon: "task" },
  { value: "bug", label: "Bug", icon: "bug_report" },
  { value: "refactor", label: "Refatoração", icon: "code" },
  { value: "idea", label: "Idealização", icon: "lightbulb" },
  { value: "pending", label: "Pendência", icon: "pending" },
  { value: "improvement", label: "Melhoria", icon: "trending_up" },
  { value: "meeting", label: "Reunião", icon: "groups" },
  { value: "content", label: "Conteúdo", icon: "menu_book" },
  { value: "project", label: "Projeto", icon: "build" },
  { value: "note", label: "Anotação", icon: "sticky_note_2" },
  { value: "exercise", label: "Exercício", icon: "fitness_center" }
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
  category: ProductCategory;
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
  archivedAt: ISODate | null;
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
  visitedAt: ISODate | null;
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
