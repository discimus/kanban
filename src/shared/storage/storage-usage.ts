import { store } from "./index";

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
