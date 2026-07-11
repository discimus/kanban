import { Release } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateReleaseProps {
  productId: string;
  name: string;
  version?: string;
  releaseDate?: string | null;
}

export function createRelease(props: CreateReleaseProps): Release {
  if (!props.productId) throw new Error("A release precisa pertencer a um produto.");
  const name = props.name?.trim();
  if (!name) throw new Error("O nome da release é obrigatório.");
  return {
    id: uuid(),
    productId: props.productId,
    name,
    version: props.version?.trim() ?? "0.1.0",
    releaseDate: props.releaseDate ?? null,
    status: "planned"
  };
}

export function finalizeRelease(release: Release): Release {
  return {
    ...release,
    status: "released",
    releaseDate: release.releaseDate ?? nowISO()
  };
}
