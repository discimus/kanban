import { el, icon } from "@ui/components/dom";
import { t } from "@shared/i18n";
import { getDensity, toggleDensity, densityIcon } from "@ui/density";

/**
 * Fixed "compact mode" toggle. A two-state control, so state is exposed
 * through `aria-pressed` (unlike the theme button, which cycles three modes).
 */
export function renderDensityMenu(): HTMLElement {
  const btn = el("button", { class: "density-btn", type: "button" }, []);

  const paint = (): void => {
    const compact = getDensity() === "compact";
    btn.replaceChildren(icon(densityIcon(getDensity())));
    btn.setAttribute("aria-pressed", compact ? "true" : "false");
    btn.setAttribute("aria-label", compact ? t("density.ativado") : t("density.desativado"));
    btn.setAttribute("title", t("density.compacto"));
  };
  paint();

  btn.addEventListener("click", () => {
    toggleDensity();
    paint();
  });

  return btn;
}
