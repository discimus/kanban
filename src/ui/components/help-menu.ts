import { el, icon } from "@ui/components/dom";
import { openModal } from "../modal";

const SHORTCUTS: [string, string][] = [
  ["N", "Nova tarefa na coluna Todo"],
  ["Ctrl + Enter", "Salvar formulário"],
  ["Esc", "Fechar / Cancelar"],
];

export function openShortcutsHelp(): void {
  const items = SHORTCUTS.map(([key, desc]) =>
    el("div", { class: "shortcuts-item" }, [
      el("kbd", {}, [key]),
      el("span", {}, [desc]),
    ])
  );

  openModal({
    title: "Atalhos do teclado",
    body: el("div", { class: "shortcuts-list" }, items),
  });
}

export function renderHelpMenu(): HTMLElement {
  const btn = el("button", {
    class: "help-btn",
    type: "button",
    title: "Atalhos do teclado (?)",
    "aria-label": "Atalhos do teclado",
  }, [icon("help_outline")]);

  btn.addEventListener("click", openShortcutsHelp);
  return btn;
}
