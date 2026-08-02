import { Sticky } from "@shared/types";
import { eventBus } from "@shared/events";
import { nowISO } from "@shared/utils";
import {
  createSticky,
  CreateStickyProps,
  setStickyTitle,
  setStickyDescription,
  createStickyFromBacklog,
  addStickyLink,
  AddStickyLinkProps,
  markStickyLinkVisited,
  removeStickyLink,
  addStickyComment,
  AddStickyCommentProps,
  removeStickyComment,
  addStickyImage,
  AddStickyImageProps,
  removeStickyImage,
  addStickyAudio,
  AddStickyAudioProps,
  removeStickyAudio
} from "../domain/sticky";
import { stickyRepository } from "../infrastructure/sticky.repository";
import { backlogRepository } from "@contexts/product/infrastructure/backlog.repository";
import { linkService } from "@contexts/link/application/link.service";
import { commentService } from "@contexts/comment/application/comment.service";
import { imageService } from "@contexts/image/application/image.service";
import { audioService } from "@contexts/audio/application/audio.service";
import { productService } from "@contexts/product/application/product.service";
import { putBlob, deleteBlob, dataUrlToBlob } from "@shared/storage/blob-store";

export const stickyService = {
  byProduct(productId: string): Sticky[] {
    return stickyRepository.byProduct(productId);
  },

  get(id: string): Sticky | undefined {
    return stickyRepository.findById(id);
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

  convertFromBacklog(backlogItemId: string): Sticky {
    const item = backlogRepository.findById(backlogItemId);
    if (!item) throw new Error("Item de backlog não encontrado.");
    if (item.archivedAt) throw new Error("Itens arquivados não podem ser convertidos.");
    const product = productService.get(item.productId);
    if (product && (product.status === "completed" || product.status === "canceled" || product.archivedAt)) {
      throw new Error("O projeto está concluído, cancelado ou arquivado. Não é possível modificar os itens.");
    }
    const sticky = createStickyFromBacklog(item, {
      links: linkService.byBacklogItem(item.id),
      comments: commentService.byBacklogItem(item.id),
      images: imageService.byBacklogItem(item.id),
      audios: audioService.byBacklogItem(item.id)
    });
    stickyRepository.add(sticky);
    for (const a of sticky.audios ?? []) void putBlob(a.id, dataUrlToBlob(a.dataUrl));
    eventBus.emit("sticky:created", sticky);
    backlogRepository.remove(item.id);
    eventBus.emit("backlog:deleted", item.id);
    productService.recomputeStatus(item.productId);
    return sticky;
  },

  updateContent(id: string, props: { title: string; description: string }): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = setStickyDescription(setStickyTitle(existing, props.title), props.description);
    stickyRepository.save(updated);
    eventBus.emit("sticky:content-updated", updated);
    return updated;
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
  },

  addAudio(id: string, props: AddStickyAudioProps): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = addStickyAudio(existing, props);
    stickyRepository.save(updated);
    const added = updated.audios![updated.audios!.length - 1];
    void putBlob(added.id, dataUrlToBlob(added.dataUrl));
    eventBus.emit("sticky:audio-added", updated);
    return updated;
  },

  removeAudio(id: string, audioId: string): Sticky {
    const existing = stickyRepository.findById(id);
    if (!existing) throw new Error("Card não encontrado.");
    const updated = removeStickyAudio(existing, audioId);
    stickyRepository.save(updated);
    void deleteBlob(audioId);
    eventBus.emit("sticky:audio-removed", updated);
    return updated;
  }
};
