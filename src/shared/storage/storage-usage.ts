import { store } from "./index";
import type { AppState, BacklogItem, Image, Product } from "@shared/types";

const ESTIMATED_TOTAL_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  percentage: number;
  label: string;
}

export function getStorageUsage(): StorageUsage {
  const state = store.getState();
  let imageBytes = 0;
  for (const img of state.images) {
    imageBytes += img.fileSize;
  }

  const stateWithoutImages = { ...state, images: [] };
  const stateJson = JSON.stringify(stateWithoutImages);
  const stateBytes = new Blob([stateJson]).size;
  const usedBytes = stateBytes + imageBytes;
  const percentage = Math.min(100, (usedBytes / ESTIMATED_TOTAL_BYTES) * 100);

  return {
    usedBytes,
    totalBytes: ESTIMATED_TOTAL_BYTES,
    percentage,
    label: `${formatBytes(usedBytes)} / ${formatBytes(ESTIMATED_TOTAL_BYTES)}`
  };
}

export interface CardsWithImagesEntry {
  product: Product;
  item: BacklogItem;
  images: Image[];
}

/**
 * Collects non-archived board cards (backlog items) that hold at least one
 * image, grouped with their owning product. Excludes archived products so the
 * target card is always visible after navigation.
 */
export function getCardsWithImages(state: AppState): CardsWithImagesEntry[] {
  const productById = new Map(state.products.map((p) => [p.id, p] as const));
  const entries: CardsWithImagesEntry[] = [];

  for (const item of state.backlogItems) {
    if (item.archivedAt) continue;
    const product = productById.get(item.productId);
    if (!product || product.archivedAt) continue;
    const images = state.images.filter((img) => img.backlogItemId === item.id);
    if (images.length === 0) continue;
    entries.push({ product, item, images });
  }

  entries.sort((a, b) => {
    const byName = a.product.name.localeCompare(b.product.name);
    if (byName !== 0) return byName;
    return b.item.createdAt.localeCompare(a.item.createdAt);
  });

  return entries;
}
