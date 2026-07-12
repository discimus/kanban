import { Link } from "@shared/types";
import { store } from "@shared/storage";

export const linkRepository = {
  all(): Link[] {
    return store.getState().links;
  },

  byBacklogItem(backlogItemId: string): Link[] {
    return store.getState().links.filter((l) => l.backlogItemId === backlogItemId);
  },

  findById(id: string): Link | undefined {
    return store.getState().links.find((l) => l.id === id);
  },

  add(link: Link): void {
    store.update((s) => {
      s.links.push(link);
    });
  },

  save(link: Link): void {
    store.update((s) => {
      const idx = s.links.findIndex((l) => l.id === link.id);
      if (idx >= 0) s.links[idx] = link;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.links = s.links.filter((l) => l.id !== id);
    });
  }
};
