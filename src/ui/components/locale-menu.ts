import { el } from "@ui/components/dom";
import { getLocale, setLocale } from "@shared/i18n";

export function renderLocaleMenu(): HTMLElement {
  const btn = el("button", { class: "locale-btn", type: "button" }, []);

  const paint = (): void => {
    const locale = getLocale();
    const flag = locale === "en" ? "🇺🇸" : "🇧🇷";
    btn.textContent = flag;
    const aria = locale === "en" ? "Idioma: English" : "Idioma: Português";
    btn.setAttribute("aria-label", aria);
    btn.setAttribute("title", aria);
  };
  paint();

  btn.addEventListener("click", () => {
    const next = getLocale() === "en" ? "pt" : "en";
    setLocale(next);
    paint();
  });

  return btn;
}
