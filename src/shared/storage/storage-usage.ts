import { store } from "./index";
import type { AppState, BacklogItem, Image, Product } from "@shared/types";

const ESTIMATED_TOTAL_BYTES = 5 * 1024 * 1024;

let cachedQuotaTotal: number | null = null;
let quotaPromise: Promise<number | null> | null = null;

function fetchQuotaTotal(): Promise<number | null> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      return navigator.storage
        .estimate()
        .then((est) => est.quota ?? null)
        .catch(() => null);
    }
  } catch { /* ignore */ }
  return Promise.resolve(null);
}

export function isStorageQuotaLoaded(): boolean {
  return cachedQuotaTotal !== null;
}

/**
 * Fetches the real origin quota once per session and caches it. The quota
 * total is stable (unlike `usage`, which lags behind IndexedDB writes), so it
 * is the only async value used by the storage meter. Resolves with `true` when
 * a real quota was obtained; callers keep the fallback otherwise. Idempotent.
 */
export function ensureStorageQuotaLoaded(): Promise<boolean> {
  if (cachedQuotaTotal !== null) return Promise.resolve(true);
  if (!quotaPromise) {
    quotaPromise = fetchQuotaTotal().then((q) => {
      if (q !== null) cachedQuotaTotal = q;
      return q;
    });
  }
  return quotaPromise.then((q) => q !== null);
}

export function formatBytes(bytes: number): string {
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
  let audioBytes = 0;
  for (const a of state.audios) {
    audioBytes += a.fileSize;
  }

  const stateWithoutBlobs = { ...state, images: [], audios: [] };
  const stateJson = JSON.stringify(stateWithoutBlobs);
  const stateBytes = new Blob([stateJson]).size;
  const usedBytes = stateBytes + imageBytes + audioBytes;
  const totalBytes = cachedQuotaTotal ?? ESTIMATED_TOTAL_BYTES;
  const percentage = Math.min(100, (usedBytes / totalBytes) * 100);

  return {
    usedBytes,
    totalBytes,
    percentage,
    label: `${formatBytes(usedBytes)} / ${formatBytes(totalBytes)}`
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
