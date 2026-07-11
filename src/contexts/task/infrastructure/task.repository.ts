import { Task } from "@shared/types";
import { store } from "@shared/storage";

export const taskRepository = {
  all(): Task[] {
    return store.getState().tasks;
  },

  byBacklogItem(backlogItemId: string): Task[] {
    return store.getState().tasks.filter((t) => t.backlogItemId === backlogItemId);
  },

  findById(id: string): Task | undefined {
    return store.getState().tasks.find((t) => t.id === id);
  },

  add(task: Task): void {
    store.update((s) => {
      s.tasks.push(task);
    });
  },

  save(task: Task): void {
    store.update((s) => {
      const idx = s.tasks.findIndex((t) => t.id === task.id);
      if (idx >= 0) s.tasks[idx] = task;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.tasks = s.tasks.filter((t) => t.id !== id);
      s.estimations = s.estimations.filter((e) => e.taskId !== id);
    });
  }
};
