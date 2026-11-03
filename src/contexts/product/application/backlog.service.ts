import { BacklogItem, KanbanStatus, Priority, TaskClassification, Product } from "@shared/types";
import { eventBus } from "@shared/events";
import { nowISO } from "@shared/utils";
import { store } from "@shared/storage";
import {
  createBacklogItem,
  CreateBacklogItemProps,
  archive as archiveItem,
  restore as restoreItem,
  changeProduct as changeProductDomain,
  defaultClassificationForCategory,
  linkFromStickyLink,
  commentFromStickyComment,
  imageFromStickyImage
} from "../domain/backlog-item";
import { backlogRepository } from "../infrastructure/backlog.repository";
import { productRepository } from "../infrastructure/product.repository";
import { productService } from "./product.service";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { audioService } from "@contexts/audio/application/audio.service";

function assertProductEditable(productId: string): void {
  const product = productService.get(productId);
  if (product && (product.status === "completed" || product.status === "canceled" || product.archivedAt)) {
    throw new Error("O projeto está concluído, cancelado ou arquivado. Não é possível modificar os itens.");
  }
}

export const backlogService = {
  list(): BacklogItem[] {
    return backlogRepository.all();
  },

  byProduct(productId: string): BacklogItem[] {
    return backlogRepository.byProduct(productId);
  },

  get(id: string): BacklogItem | undefined {
    return backlogRepository.findById(id);
  },

  create(props: CreateBacklogItemProps): BacklogItem {
    assertProductEditable(props.productId);
    const item = createBacklogItem(props);
    backlogRepository.add(item);
    eventBus.emit("backlog:created", item);
    return item;
  },

  edit(
    id: string,
    changes: { title: string; description: string; priority: Priority; storyPoints: number; classification: TaskClassification }
  ): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    assertProductEditable(existing.productId);
    if (!changes.title.trim()) throw new Error("O título do item é obrigatório.");
    const updated: BacklogItem = {
      ...existing,
      title: changes.title.trim(),
      description: changes.description.trim(),
      priority: changes.priority,
      storyPoints: Math.max(0, changes.storyPoints),
      classification: changes.classification
    };
    backlogRepository.save(updated);
    eventBus.emit("backlog:updated", updated);
    return updated;
  },

  classify(id: string, classification: TaskClassification): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    assertProductEditable(existing.productId);
    if (existing.classification === classification) return existing;
    const updated: BacklogItem = { ...existing, classification };
    backlogRepository.save(updated);
    eventBus.emit("backlog:updated", updated);
    return updated;
  },

  setStoryPoints(id: string, points: number): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    assertProductEditable(existing.productId);
    const updated: BacklogItem = { ...existing, storyPoints: points };
    backlogRepository.save(updated);
    eventBus.emit("backlog:updated", updated);
    return updated;
  },

  prioritize(id: string, priority: Priority): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    const updated: BacklogItem = { ...existing, priority };
    backlogRepository.save(updated);
    eventBus.emit("backlog:updated", updated);
    return updated;
  },

  move(id: string, status: KanbanStatus): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    const product = productService.get(existing.productId);
    if (product && (product.status === "completed" || product.status === "canceled" || product.archivedAt)) {
      throw new Error("O projeto está concluído, cancelado ou arquivado. Não é possível mover os itens.");
    }
    if (existing.status === status) return existing;
    const updated = applyMove(existing, status);
    runAfterMove(updated);
    return updated;
  },

  changeProduct(id: string, newProductId: string): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    const sourceProduct = productService.get(existing.productId);
    if (sourceProduct && (sourceProduct.status === "completed" || sourceProduct.status === "canceled" || sourceProduct.archivedAt)) {
      throw new Error("O projeto de origem está concluído, cancelado ou arquivado. Não é possível mover os itens.");
    }
    const targetProduct = productService.get(newProductId);
    if (!targetProduct) throw new Error("Projeto de destino não encontrado.");
    if (targetProduct.status === "completed" || targetProduct.status === "canceled" || targetProduct.archivedAt) {
      throw new Error("O projeto de destino está concluído, cancelado ou arquivado.");
    }
    if (existing.productId === newProductId) return existing;
    const oldProductId = existing.productId;
    const defaultClassification = defaultClassificationForCategory(targetProduct.category);
    const updated = changeProductDomain(existing, newProductId, defaultClassification);
    backlogRepository.save(updated);
    eventBus.emit("backlog:product-changed", updated);
    productService.recomputeStatus(oldProductId);
    productService.recomputeStatus(newProductId);
    return updated;
  },

  delete(id: string): void {
    const existing = backlogRepository.findById(id);
    if (existing) assertProductEditable(existing.productId);
    backlogRepository.remove(id);
    eventBus.emit("backlog:deleted", id);
  },

  convertFromSticky(stickyId: string): BacklogItem {
    const sticky = stickyService.get(stickyId);
    if (!sticky) throw new Error("Card não encontrado.");
    assertProductEditable(sticky.productId);
    const product = productService.get(sticky.productId);
    const classification = defaultClassificationForCategory(product?.category ?? "development");
    const item = createBacklogItem({
      productId: sticky.productId,
      title: sticky.title,
      description: sticky.description,
      classification
    });
    backlogRepository.add(item);
    eventBus.emit("backlog:created", item);
    store.update((s) => {
      for (const sl of sticky.links) s.links.push(linkFromStickyLink(sl, item.id));
      for (const sc of sticky.comments) s.comments.push(commentFromStickyComment(sc, item.id));
      for (const si of sticky.images) s.images.push(imageFromStickyImage(si, item.id));
    });
    for (const sa of sticky.audios ?? []) {
      audioService.create({
        backlogItemId: item.id,
        dataUrl: sa.dataUrl,
        filename: sa.filename,
        mimeType: sa.mimeType,
        fileSize: sa.fileSize,
        duration: sa.duration
      });
    }
    stickyService.delete(sticky.id);
    productService.recomputeStatus(item.productId);
    return item;
  },

  archive(id: string): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    const updated = archiveItem(existing, nowISO());
    backlogRepository.save(updated);
    eventBus.emit("backlog:archived", updated);
    return updated;
  },

  restore(id: string): BacklogItem {
    const existing = backlogRepository.findById(id);
    if (!existing) throw new Error("Item de backlog não encontrado.");
    const updated = restoreItem(existing);
    backlogRepository.save(updated);
    eventBus.emit("backlog:restored", updated);
    return updated;
  }
};

function applyMove(existing: BacklogItem, status: KanbanStatus): BacklogItem {
  const now = nowISO();
  const updated: BacklogItem = {
    ...existing,
    status,
    completedAt: status === "done" ? now : null,
    reviewEnteredAt: status === "review" ? now : null
  };
  backlogRepository.save(updated);
  eventBus.emit("backlog:moved", updated);
  productService.recomputeStatus(updated.productId);
  return updated;
}

function notifyPendingCompletion(productId: string): void {
  if (!productService.allItemsDone(productId)) return;
  const product = productService.get(productId);
  if (product && product.status !== "completed") {
    eventBus.emit("product:pending-completion", productId);
  }
}

function runAfterMove(updated: BacklogItem): void {
  const autoCompletedProducts = runAutoCompleteReview();
  runAutoArchive();
  if (!autoCompletedProducts.has(updated.productId)) {
    notifyPendingCompletion(updated.productId);
  }
}

/**
 * Moves cards from Review to Done once the project's configured period
 * (`reviewAutoDoneDays`) has elapsed since they entered Review.
 * Cards from legacy data without `reviewEnteredAt` start counting now.
 * Returns the ids of the products that had at least one card completed.
 */
export function runAutoCompleteReview(): Set<string> {
  const products = new Map<string, Product>(productRepository.all().map((p) => [p.id, p]));
  const completedProducts = new Set<string>();
  let count = 0;

  for (const item of backlogRepository.all()) {
    if (item.status !== "review" || item.archivedAt) continue;
    const product = products.get(item.productId);
    if (!product || product.status === "completed" || product.status === "canceled" || product.archivedAt) continue;
    const days = product.reviewAutoDoneDays;
    if (!days || days <= 0) continue;

    if (!item.reviewEnteredAt) {
      backlogRepository.save({ ...item, reviewEnteredAt: nowISO() });
      continue;
    }

    const elapsed = Date.now() - new Date(item.reviewEnteredAt).getTime();
    if (elapsed >= days * 86400000) {
      applyMove(item, "done");
      completedProducts.add(item.productId);
      count++;
    }
  }

  if (count > 0) eventBus.emit("backlog:auto-completed", count);
  for (const productId of completedProducts) notifyPendingCompletion(productId);
  return completedProducts;
}

export function runAutoArchive(): void {
  const items = backlogRepository.all();
  const products = new Map<string, Product>(productRepository.all().map((p) => [p.id, p]));
  let count = 0;
  for (const item of items) {
    if (item.status !== "done" || item.archivedAt) continue;
    const product = products.get(item.productId);
    if (!product?.autoArchiveDays || !item.completedAt) continue;
    const elapsed = Date.now() - new Date(item.completedAt).getTime();
    if (elapsed >= product.autoArchiveDays * 86400000) {
      const updated = archiveItem(item, nowISO());
      backlogRepository.save(updated);
      count++;
    }
  }
  if (count > 0) eventBus.emit("backlog:auto-archived", count);
}
