import { el, icon } from "@ui/components/dom";
import { openModal } from "../modal";
import { t } from "@shared/i18n";

function getTaskShortcuts(): [string, string][] {
  return [
    ["N", t("help.novaTarefa")],
    ["Ctrl + Enter", t("help.salvarFormulario")],
    ["Esc", t("help.fechar")],
  ];
}

function getNotesShortcuts(): [string, string][] {
  return [
    ["N", t("help.novaAnotacao")],
    ["Ctrl + Enter", t("help.salvarFormulario")],
    ["Esc", t("help.fechar")],
  ];
}

export function openShortcutsHelp(): void {
  const isNotes = !!document.querySelector(".board--notes");
  const items = (isNotes ? getNotesShortcuts() : getTaskShortcuts()).map(([key, desc]) =>
    el("div", { class: "shortcuts-item" }, [
      el("kbd", {}, [key]),
      el("span", {}, [desc]),
    ])
  );

  const body = el("div", { class: "shortcuts-list" }, items);

  const credits = el("div", { class: "shortcuts-credits" }, [
    el("span", {}, ["Made with "]),
    icon("favorite", "shortcuts-credits__icon"),
    el("span", {}, [" by "]),
    el("a", {
      href: "https://discimus.github.io/",
      target: "_blank",
      rel: "noopener"
    }, ["discimus"])
  ]);
  body.append(credits);

  openModal({
    title: t("help.title"),
    body,
  });
}

export function renderHelpMenu(): HTMLElement {
  const btn = el("button", {
    class: "help-btn",
    type: "button",
    title: t("help.title") + " (?)",
    "aria-label": t("help.title"),
  }, [icon("help_outline")]);

  btn.addEventListener("click", openShortcutsHelp);
  return btn;
}
