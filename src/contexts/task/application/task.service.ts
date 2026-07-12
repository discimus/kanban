import { Task, TaskStatus } from "@shared/types";
import { eventBus } from "@shared/events";
import { createTask, changeStatus, assign, rename, CreateTaskProps } from "../domain/task";
import { taskRepository } from "../infrastructure/task.repository";

export const taskService = {
  list(): Task[] {
    return taskRepository.all();
  },

  byBacklogItem(backlogItemId: string): Task[] {
    return taskRepository.byBacklogItem(backlogItemId);
  },

  get(id: string): Task | undefined {
    return taskRepository.findById(id);
  },

  create(props: CreateTaskProps): Task {
    const task = createTask(props);
    taskRepository.add(task);
    eventBus.emit("task:created", task);
    return task;
  },

  changeStatus(id: string, status: TaskStatus): Task {
    const existing = taskRepository.findById(id);
    if (!existing) throw new Error("Tarefa não encontrada.");
    const updated = changeStatus(existing, status);
    taskRepository.save(updated);
    eventBus.emit("task:updated", updated);
    return updated;
  },

  assign(id: string, assignedTo: string): Task {
    const existing = taskRepository.findById(id);
    if (!existing) throw new Error("Tarefa não encontrada.");
    const updated = assign(existing, assignedTo);
    taskRepository.save(updated);
    eventBus.emit("task:updated", updated);
    return updated;
  },

  rename(id: string, title: string): Task {
    const existing = taskRepository.findById(id);
    if (!existing) throw new Error("Tarefa não encontrada.");
    const updated = rename(existing, title);
    taskRepository.save(updated);
    eventBus.emit("task:updated", updated);
    return updated;
  },

  delete(id: string): void {
    taskRepository.remove(id);
  }
};
