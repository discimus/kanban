import { Comment } from "@shared/types";
import { eventBus } from "@shared/events";
import { createComment, CreateCommentProps } from "../domain/comment";
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

  delete(id: string): void {
    commentRepository.remove(id);
    eventBus.emit("comment:deleted", id);
  }
};
