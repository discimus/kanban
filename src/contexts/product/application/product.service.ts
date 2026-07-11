import { Product } from "@shared/types";
import { eventBus } from "@shared/events";
import { createProduct, assertValidProductName } from "../domain/product";
import { productRepository } from "../infrastructure/product.repository";

export const productService = {
  list(): Product[] {
    return productRepository.all();
  },

  get(id: string): Product | undefined {
    return productRepository.findById(id);
  },

  create(name: string, description = ""): Product {
    const product = createProduct({ name, description });
    productRepository.add(product);
    eventBus.emit("product:created", product);
    return product;
  },

  edit(id: string, changes: { name: string; description: string }): Product {
    const existing = productRepository.findById(id);
    if (!existing) throw new Error("Produto não encontrado.");
    assertValidProductName(changes.name);
    const updated: Product = {
      ...existing,
      name: changes.name.trim(),
      description: changes.description.trim()
    };
    productRepository.save(updated);
    eventBus.emit("product:updated", updated);
    return updated;
  },

  delete(id: string): void {
    productRepository.remove(id);
    eventBus.emit("product:deleted", id);
  }
};
