import { Task, TaskStatus } from "@shared/types";
import { uuid } from "@shared/utils";

export interface CreateTaskProps {
  backlogItemId: string;
  title: string;
  assignedTo?: string;
}

export function createTask(props: CreateTaskProps): Task {
  if (!props.backlogItemId) throw new Error("A tarefa precisa pertencer a um item de backlog.");
  const title = props.title?.trim();
  if (!title) throw new Error("O título da tarefa é obrigatório.");
  return {
    id: uuid(),
    backlogItemId: props.backlogItemId,
    title,
    status: "todo",
    assignedTo: props.assignedTo?.trim() ?? ""
  };
}

export function changeStatus(task: Task, status: TaskStatus): Task {
  return { ...task, status };
}

export function assign(task: Task, assignedTo: string): Task {
  return { ...task, assignedTo: assignedTo.trim() };
}
