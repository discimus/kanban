import { Comment } from "@shared/types";
import { eventBus } from "@shared/events";
import { createComment, editComment as editCommentFn, CreateCommentProps } from "../domain/comment";
import { commentRepository } from "../infrastructure/comment.repository";

export const commentService = {
  byBacklogItem(backlogItemId: string): Comment[] {
    return commentRepository.byBacklogItem(backlogItemId);
  },

  create(props: CreateCommentProps): Comment {
    const comment = createComment(props);
    commentRepository.add(comment);
    eventBus.emit("comment:created", comment);
    return comment;
  },

  edit(id: string, text: string): Comment {
    const existing = commentRepository.findById(id);
    if (!existing) throw new Error("Comentário não encontrado.");
    const updated = editCommentFn(existing, text);
    commentRepository.save(updated);
    eventBus.emit("comment:updated", updated);
    return updated;
  },

  delete(id: string): void {
    commentRepository.remove(id);
    eventBus.emit("comment:deleted", id);
  }
};
