const KEY_PREFIX = "kanban-sticky-collapsed:";

export function isStickyCollapsed(productId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + productId) === "1";
  } catch {
    return false;
  }
}

export function setStickyCollapsed(productId: string, collapsed: boolean): void {
  try {
    if (collapsed) {
      localStorage.setItem(KEY_PREFIX + productId, "1");
    } else {
      localStorage.removeItem(KEY_PREFIX + productId);
    }
  } catch { /* storage unavailable — ignore */ }
}
