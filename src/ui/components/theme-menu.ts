import { el, icon } from "@ui/components/dom";
import { getTheme, cycleTheme, themeIcon, themeLabel } from "@ui/theme";

export function renderThemeMenu(): HTMLElement {
  const btn = el("button", { class: "theme-toggle", type: "button" }, []);

  const paint = (): void => {
    const mode = getTheme();
    btn.replaceChildren(icon(themeIcon(mode)));
    btn.setAttribute("aria-label", `Tema: ${themeLabel(mode)}`);
    btn.setAttribute("title", `Tema: ${themeLabel(mode)}`);
  };
  paint();

  btn.addEventListener("click", () => {
    cycleTheme();
    paint();
  });

  return btn;
}
