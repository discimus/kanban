import { Image } from "@shared/types";
import { store } from "@shared/storage";

export const imageRepository = {
  all(): Image[] {
    return store.getState().images;
  },

  byBacklogItem(backlogItemId: string): Image[] {
    return store.getState().images.filter((img) => img.backlogItemId === backlogItemId);
  },

  findById(id: string): Image | undefined {
    return store.getState().images.find((img) => img.id === id);
  },

  add(image: Image): void {
    store.update((s) => {
      s.images.push(image);
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.images = s.images.filter((img) => img.id !== id);
    });
  }
};
