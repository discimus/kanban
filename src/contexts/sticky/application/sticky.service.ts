import { Sticky } from "@shared/types";
import { eventBus } from "@shared/events";
import { nowISO } from "@shared/utils";
import {
  createSticky,
  CreateStickyProps,
  addStickyLink,
  AddStickyLinkProps,
  markStickyLinkVisited,
  removeStickyLink,
  addStickyComment,
  AddStickyCommentProps,
  removeStickyComment,
  addStickyImage,
  AddStickyImageProps,
  removeStickyImage
} from "../domain/sticky";
import { stickyRepository } from "../infrastructure/sticky.repository";

export const stickyService = {
  byProduct(productId: string): Sticky[] {
    return stickyRepository.byProduct(productId);
  },

  create(props: CreateStickyProps): Sticky {
    const sticky = createSticky(props);
    stickyRepository.add(sticky);
    eventBus.emit("sticky:created", sticky);
    return sticky;
  },

  delete(id: string): void {
    stickyRepository.remove(id);
    eventBus.emit("sticky:deleted", id);
  },

  addLink(id: string, props: AddStickyLinkProps): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = addStickyLink(existing, props);
    stickyRepository.save(updated);
    eventBus.emit("sticky:link-added", updated);
    return updated;
  },

  markLinkVisited(id: string, linkId: string): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = markStickyLinkVisited(existing, linkId, nowISO());
    stickyRepository.save(updated);
    eventBus.emit("sticky:link-visited", updated);
    return updated;
  },

  removeLink(id: string, linkId: string): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = removeStickyLink(existing, linkId);
    stickyRepository.save(updated);
    eventBus.emit("sticky:link-removed", updated);
    return updated;
  },

  addComment(id: string, props: AddStickyCommentProps): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = addStickyComment(existing, props);
    stickyRepository.save(updated);
    eventBus.emit("sticky:comment-added", updated);
    return updated;
  },

  removeComment(id: string, commentId: string): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = removeStickyComment(existing, commentId);
    stickyRepository.save(updated);
    eventBus.emit("sticky:comment-removed", updated);
    return updated;
  },

  addImage(id: string, props: AddStickyImageProps): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = addStickyImage(existing, props);
    stickyRepository.save(updated);
    eventBus.emit("sticky:image-added", updated);
    return updated;
  },

  removeImage(id: string, imageId: string): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = removeStickyImage(existing, imageId);
    stickyRepository.save(updated);
    eventBus.emit("sticky:image-removed", updated);
    return updated;
  }
};
