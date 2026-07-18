import { Product, ProductStatus, ProductCategory } from "@shared/types";
import { eventBus } from "@shared/events";
import { nowISO } from "@shared/utils";
import { createProduct, assertValidProductName, archive as archiveItem, restore as restoreItem } from "../domain/product";
import { productRepository } from "../infrastructure/product.repository";
import { backlogRepository } from "../infrastructure/backlog.repository";

export const productService = {
  list(): Product[] {
    return productRepository.all();
  },

  get(id: string): Product | undefined {
    return productRepository.findById(id);
  },

  create(name: string, description = "", category: ProductCategory = "development"): Product {
    const product = createProduct({ name, description, category });
    productRepository.add(product);
    eventBus.emit("product:created", product);
    return product;
  },

  edit(id: string, changes: { name?: string; description?: string; showPriority?: boolean; category?: ProductCategory; autoArchiveDays?: number | null; autoPasteLinks?: boolean; autoPasteImages?: boolean; showReview?: boolean }): Product {
    const existing = productRepository.findById(id);
    if (!existing) throw new Error("Projeto não encontrado.");
    if (changes.name !== undefined) assertValidProductName(changes.name);
    if (changes.category && changes.category !== existing.category) {
      if (changes.category === "notes" || existing.category === "notes") {
        throw new Error("Não é possível alterar a categoria de/para Notas.");
      }
    }
    if (changes.showReview === false) {
      const itemsInReview = backlogRepository.byProduct(id).filter((i) => i.status === "review");
      if (itemsInReview.length > 0) {
        throw new Error("Não é possível ocultar a coluna Review pois existem cards nela.");
      }
    }
    const updated: Product = {
      ...existing,
      name: changes.name?.trim() ?? existing.name,
      description: changes.description?.trim() ?? existing.description,
      showPriority: changes.showPriority ?? existing.showPriority,
      category: changes.category ?? existing.category,
      autoArchiveDays: changes.autoArchiveDays !== undefined ? changes.autoArchiveDays : existing.autoArchiveDays,
      autoPasteLinks: changes.autoPasteLinks ?? existing.autoPasteLinks,
      autoPasteImages: changes.autoPasteImages ?? existing.autoPasteImages,
      showReview: changes.showReview ?? existing.showReview
    };
    productRepository.save(updated);
    eventBus.emit("product:updated", updated);
    return updated;
  },

  setStatus(id: string, status: ProductStatus): Product {
    const existing = productRepository.findById(id);
    if (!existing) throw new Error("Projeto não encontrado.");
    const updated: Product = { ...existing, status };
    productRepository.save(updated);
    eventBus.emit("product:updated", updated);
    return updated;
  },

  recomputeStatus(productId: string): Product | undefined {
    const existing = productRepository.findById(productId);
    if (!existing) return undefined;
    if (existing.status === "canceled") return existing;

    const items = backlogRepository.byProduct(productId);
    let next: ProductStatus;
    if (items.length === 0 || items.every((i) => i.status === "todo")) {
      next = "backlog";
    } else if (items.every((i) => i.status === "done")) {
      return existing;
    } else {
      next = "in_progress";
    }

    if (next !== existing.status) {
      return this.setStatus(productId, next);
    }
    return existing;
  },

  allItemsDone(productId: string): boolean {
    const items = backlogRepository.byProduct(productId);
    return items.length > 0 && items.every((i) => i.status === "done");
  },

  delete(id: string): void {
    productRepository.remove(id);
    eventBus.emit("product:deleted", id);
  },

  archive(id: string): Product {
    const existing = productRepository.findById(id);
    if (!existing) throw new Error("Projeto não encontrado.");
    const updated = archiveItem(existing, nowISO());
    productRepository.save(updated);
    eventBus.emit("product:archived", updated);
    return updated;
  },

  restore(id: string): Product {
    const existing = productRepository.findById(id);
    if (!existing) throw new Error("Projeto não encontrado.");
    const updated = restoreItem(existing);
    productRepository.save(updated);
    eventBus.emit("product:restored", updated);
    return updated;
  }
};
