export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "kanban-ddd-theme";
export const THEME_MODES: ThemeMode[] = ["auto", "light", "dark"];

const ICONS: Record<ThemeMode, string> = {
  auto: "brightness_auto",
  light: "light_mode",
  dark: "dark_mode"
};

const LABELS: Record<ThemeMode, string> = {
  auto: "Automático",
  light: "Claro",
  dark: "Escuro"
};

export function getTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "auto") return raw;
  } catch {
    /* storage unavailable — fall through */
  }
  return "auto";
}

export function applyTheme(mode: ThemeMode): void {
  const el = document.documentElement;
  if (mode === "auto") {
    el.removeAttribute("data-theme");
  } else {
    el.setAttribute("data-theme", mode);
  }
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function cycleTheme(): ThemeMode {
  const current = getTheme();
  const next = THEME_MODES[(THEME_MODES.indexOf(current) + 1) % THEME_MODES.length];
  applyTheme(next);
  return next;
}

export function themeIcon(mode: ThemeMode): string {
  return ICONS[mode];
}

export function themeLabel(mode: ThemeMode): string {
  return LABELS[mode];
}
