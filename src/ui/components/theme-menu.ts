import { el, icon } from "@ui/components/dom";
import { getTheme, applyTheme, THEME_MODES, themeIcon, themeLabel, ThemeMode } from "@ui/theme";

function renderDropdownItems(current: ThemeMode): HTMLElement[] {
  return THEME_MODES.map((mode) => {
    const isActive = mode === current;
    const item = el("button", {
      class: `theme-dropdown__item${isActive ? " theme-dropdown__item--active" : ""}`,
      "data-mode": mode
    }, [
      icon(themeIcon(mode)),
      themeLabel(mode)
    ]);
    item.addEventListener("click", (ev) => {
      ev.stopPropagation();
      applyTheme(mode);
      closeMenu();
    });
    return item;
  });
}

let fabContainer: HTMLElement | null = null;
let outsideHandler: ((ev: Event) => void) | null = null;

function closeMenu(): void {
  if (!fabContainer) return;
  fabContainer.classList.remove("theme-fab--open");
  if (outsideHandler) {
    document.removeEventListener("click", outsideHandler);
    outsideHandler = null;
  }
}

function toggleMenu(): void {
  if (!fabContainer) return;
  const isOpen = fabContainer.classList.toggle("theme-fab--open");
  if (isOpen) {
    outsideHandler = (ev: Event) => {
      if (fabContainer && !fabContainer.contains(ev.target as Node)) {
        closeMenu();
      }
    };
    // defer so the same click that opened does not immediately close
    setTimeout(() => {
      document.addEventListener("click", outsideHandler!);
    }, 0);
  } else {
    if (outsideHandler) {
      document.removeEventListener("click", outsideHandler);
      outsideHandler = null;
    }
  }
}

export function renderThemeMenu(): HTMLElement {
  const current = getTheme();

  const btn = el("button", { class: "theme-fab__btn", "aria-label": "Alterar tema" }, [
    icon(themeIcon(current))
  ]);
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleMenu();
  });

  const dropdown = el("div", { class: "theme-dropdown", }, renderDropdownItems(current));

  fabContainer = el("div", { class: "theme-fab" }, [btn, dropdown]);
  return fabContainer;
}
