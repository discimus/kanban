import { Release } from "@shared/types";
import { store } from "@shared/storage";

export const releaseRepository = {
  all(): Release[] {
    return store.getState().releases;
  },

  byProduct(productId: string): Release[] {
    return store.getState().releases.filter((r) => r.productId === productId);
  },

  findById(id: string): Release | undefined {
    return store.getState().releases.find((r) => r.id === id);
  },

  add(release: Release): void {
    store.update((s) => {
      s.releases.push(release);
    });
  },

  save(release: Release): void {
    store.update((s) => {
      const idx = s.releases.findIndex((x) => x.id === release.id);
      if (idx >= 0) s.releases[idx] = release;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.releases = s.releases.filter((x) => x.id !== id);
      s.backlogItems = s.backlogItems.map((b) => (b.releaseId === id ? { ...b, releaseId: null } : b));
    });
  }
};
