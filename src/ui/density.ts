export type DensityMode = "comfortable" | "compact";

const STORAGE_KEY = "kanban-ddd-density";
const COMPACT_ATTR = "compact";

const ICONS: Record<DensityMode, string> = {
  comfortable: "unfold_more",
  compact: "unfold_less"
};

export function getDensity(): DensityMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "compact" || raw === "comfortable") return raw;
  } catch {
    /* storage unavailable — fall through */
  }
  return "comfortable";
}

/**
 * Applies the density mode to the document root. `compact` adds
 * `data-density="compact"`, which enables the spacing overrides in the
 * stylesheet; `comfortable` removes the attribute so the default layout wins.
 */
export function applyDensity(mode: DensityMode): void {
  const el = document.documentElement;
  if (mode === COMPACT_ATTR) {
    el.setAttribute("data-density", COMPACT_ATTR);
  } else {
    el.removeAttribute("data-density");
  }
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function toggleDensity(): DensityMode {
  const next: DensityMode = getDensity() === "compact" ? "comfortable" : "compact";
  applyDensity(next);
  return next;
}

export function densityIcon(mode: DensityMode): string {
  return ICONS[mode];
}
