import { BacklogItem } from "@shared/types";
import { store } from "@shared/storage";

export const backlogRepository = {
  all(): BacklogItem[] {
    return store.getState().backlogItems;
  },

  byProduct(productId: string): BacklogItem[] {
    return store.getState().backlogItems.filter((b) => b.productId === productId);
  },

  findById(id: string): BacklogItem | undefined {
    return store.getState().backlogItems.find((b) => b.id === id);
  },

  add(item: BacklogItem): void {
    store.update((s) => {
      s.backlogItems.push(item);
    });
  },

  save(item: BacklogItem): void {
    store.update((s) => {
      const idx = s.backlogItems.findIndex((b) => b.id === item.id);
      if (idx >= 0) s.backlogItems[idx] = item;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.backlogItems = s.backlogItems.filter((b) => b.id !== id);
      const removedTasks = s.tasks.filter((t) => t.backlogItemId === id).map((t) => t.id);
      s.tasks = s.tasks.filter((t) => t.backlogItemId !== id);
      s.links = s.links.filter((l) => l.backlogItemId !== id);
      s.estimations = s.estimations.filter((e) => !removedTasks.includes(e.taskId));
    });
  }
};
