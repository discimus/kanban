import { Product, ProductStatus, ProductCategory } from "@shared/types";
import { eventBus } from "@shared/events";
import { createProduct, assertValidProductName } from "../domain/product";
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

  edit(id: string, changes: { name: string; description: string; showPriority?: boolean; category?: ProductCategory; autoArchiveDays?: number | null }): Product {
    const existing = productRepository.findById(id);
    if (!existing) throw new Error("Projeto não encontrado.");
    assertValidProductName(changes.name);
    const updated: Product = {
      ...existing,
      name: changes.name.trim(),
      description: changes.description.trim(),
      showPriority: changes.showPriority ?? existing.showPriority,
      category: changes.category ?? existing.category,
      autoArchiveDays: changes.autoArchiveDays !== undefined ? changes.autoArchiveDays : existing.autoArchiveDays
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
  }
};
