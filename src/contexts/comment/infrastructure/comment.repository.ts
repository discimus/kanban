import { Comment } from "@shared/types";
import { store } from "@shared/storage";

export const commentRepository = {
  all(): Comment[] {
    return store.getState().comments;
  },

  byBacklogItem(backlogItemId: string): Comment[] {
    return store.getState().comments.filter((c) => c.backlogItemId === backlogItemId);
  },

  findById(id: string): Comment | undefined {
    return store.getState().comments.find((c) => c.id === id);
  },

  add(comment: Comment): void {
    store.update((s) => {
      s.comments.push(comment);
    });
  },

  save(comment: Comment): void {
    store.update((s) => {
      const idx = s.comments.findIndex((c) => c.id === comment.id);
      if (idx >= 0) s.comments[idx] = comment;
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.comments = s.comments.filter((c) => c.id !== id);
    });
  }
};
