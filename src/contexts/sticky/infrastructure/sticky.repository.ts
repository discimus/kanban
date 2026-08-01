import { Sticky } from "@shared/types";
import { store } from "@shared/storage";

export const stickyRepository = {
  all(): Sticky[] {
    return store.getState().stickies ?? [];
  },

  byProduct(productId: string): Sticky[] {
    return (store.getState().stickies ?? []).filter((s) => s.productId === productId);
  },

  findById(id: string): Sticky | undefined {
    return (store.getState().stickies ?? []).find((s) => s.id === id);
  },

  add(sticky: Sticky): void {
    store.update((s) => {
      s.stickies = s.stickies ?? [];
      s.stickies.push(sticky);
    });
  },

  save(sticky: Sticky): void {
    store.update((s) => {
      const list = s.stickies ?? (s.stickies = []);
      const idx = list.findIndex((st) => st.id === sticky.id);
      if (idx >= 0) list[idx] = sticky;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.stickies = (s.stickies ?? []).filter((st) => st.id !== id);
    });
  }
};
