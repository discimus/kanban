import { EstimationLog } from "@shared/types";
import { store } from "@shared/storage";

export const estimationRepository = {
  all(): EstimationLog[] {
    return store.getState().estimations;
  },

  byTask(taskId: string): EstimationLog[] {
    return store
      .getState()
      .estimations.filter((e) => e.taskId === taskId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  add(log: EstimationLog): void {
    store.update((s) => {
      s.estimations.push(log);
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.estimations = s.estimations.filter((e) => e.id !== id);
    });
  }
};
