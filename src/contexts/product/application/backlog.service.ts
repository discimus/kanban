import { BacklogItem, KanbanStatus, Priority, TaskClassification } from "@shared/types";
import { eventBus } from "@shared/events";
import { createBacklogItem, CreateBacklogItemProps } from "../domain/backlog-item";
import { backlogRepository } from "../infrastructure/backlog.repository";
import { productService } from "./product.service";

function assertProductEditable(productId: string): void {
  const product = productService.get(productId);
  if (product && (product.status === "completed" || product.status === "canceled")) {
    throw new Error("O projeto está concluído ou cancelado. Não é possível modificar os itens.");
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
    if (product && (product.status === "completed" || product.status === "canceled")) {
      throw new Error("O projeto está concluído ou cancelado. Não é possível mover os itens.");
    }
    if (existing.status === status) return existing;
    const updated: BacklogItem = { ...existing, status };
    backlogRepository.save(updated);
    eventBus.emit("backlog:moved", updated);
    productService.recomputeStatus(updated.productId);

    if (productService.allItemsDone(updated.productId)) {
      const product = productService.get(updated.productId);
      if (product && product.status !== "completed") {
        eventBus.emit("product:pending-completion", updated.productId);
      }
    }

    return updated;
  },

  delete(id: string): void {
    const existing = backlogRepository.findById(id);
    if (existing) assertProductEditable(existing.productId);
    backlogRepository.remove(id);
    eventBus.emit("backlog:deleted", id);
  }
};
