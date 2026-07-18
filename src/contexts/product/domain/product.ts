import { Product, ProductCategory } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateProductProps {
  name: string;
  description?: string;
  category?: ProductCategory;
}

export function createProduct(props: CreateProductProps): Product {
  const name = props.name?.trim();
  if (!name) {
    throw new Error("O nome do Projeto é obrigatório.");
  }
  return {
    id: uuid(),
    name,
    description: props.description?.trim() ?? "",
    createdAt: nowISO(),
    status: "backlog",
    showPriority: true,
    category: props.category ?? "development",
    autoArchiveDays: null,
    autoPasteLinks: true,
    autoPasteImages: true,
    showReview: (props.category ?? "development") === "development",
    archivedAt: null
  };
}

export function assertValidProductName(name: string): void {
  if (!name.trim()) {
    throw new Error("O nome do Projeto é obrigatório.");
  }
}

export function archive(product: Product, now: string): Product {
  return { ...product, archivedAt: now };
}

export function restore(product: Product): Product {
  return { ...product, archivedAt: null };
}
