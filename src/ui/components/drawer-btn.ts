import { el, icon } from "@ui/components/dom";

export function renderDrawerBtn(onToggle: () => void): HTMLElement {
  const btn = el("button", {
    class: "drawer-btn",
    type: "button",
    "aria-label": "Trocar de projeto"
  }, [icon("list")]);
  btn.addEventListener("click", onToggle);
  return btn;
}
