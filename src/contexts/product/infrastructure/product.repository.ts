import { Product } from "@shared/types";
import { store } from "@shared/storage";

export const productRepository = {
  all(): Product[] {
    return store.getState().products;
  },

  findById(id: string): Product | undefined {
    return store.getState().products.find((p) => p.id === id);
  },

  add(product: Product): void {
    store.update((s) => {
      s.products.push(product);
    });
  },

  save(product: Product): void {
    store.update((s) => {
      const idx = s.products.findIndex((p) => p.id === product.id);
      if (idx >= 0) s.products[idx] = product;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.products = s.products.filter((p) => p.id !== id);
      const removedItems = s.backlogItems.filter((b) => b.productId === id).map((b) => b.id);
      s.backlogItems = s.backlogItems.filter((b) => b.productId !== id);
      const removedTasks = s.tasks.filter((t) => removedItems.includes(t.backlogItemId)).map((t) => t.id);
      s.tasks = s.tasks.filter((t) => !removedItems.includes(t.backlogItemId));
      s.links = s.links.filter((l) => !removedItems.includes(l.backlogItemId));
      s.comments = s.comments.filter((c) => !removedItems.includes(c.backlogItemId));
      s.estimations = s.estimations.filter((e) => !removedTasks.includes(e.taskId));
    });
  }
};
