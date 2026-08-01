export type StickyRowMode = "inline" | "wrap";

const STORAGE_KEY = "kanban-sticky-row-mode";

export function resolveStickyRowMode(raw: string | null): StickyRowMode {
  return raw === "inline" ? "inline" : "wrap";
}

export function getStickyRowMode(): StickyRowMode {
  try {
    return resolveStickyRowMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "wrap";
  }
}

export function setStickyRowMode(mode: StickyRowMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch { /* storage unavailable — ignore */ }
}

export function toggleStickyRowMode(): StickyRowMode {
  const next: StickyRowMode = getStickyRowMode() === "inline" ? "wrap" : "inline";
  setStickyRowMode(next);
  return next;
}
