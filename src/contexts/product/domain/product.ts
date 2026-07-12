import { Product } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateProductProps {
  name: string;
  description?: string;
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
    createdAt: nowISO()
  };
}

export function assertValidProductName(name: string): void {
  if (!name.trim()) {
    throw new Error("O nome do Projeto é obrigatório.");
  }
}
