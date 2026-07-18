import { el, icon } from "@ui/components/dom";
import { openModal } from "../modal";

const TASK_SHORTCUTS: [string, string][] = [
  ["N", "Nova tarefa"],
  ["Ctrl + Enter", "Salvar formulário"],
  ["Esc", "Fechar / Cancelar"],
];

const NOTES_SHORTCUTS: [string, string][] = [
  ["N", "Nova anotação"],
  ["Ctrl + Enter", "Salvar formulário"],
  ["Esc", "Fechar / Cancelar"],
];

export function openShortcutsHelp(): void {
  const isNotes = !!document.querySelector(".board--notes");
  const items = (isNotes ? NOTES_SHORTCUTS : TASK_SHORTCUTS).map(([key, desc]) =>
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
