import { el, icon } from "@ui/components/dom";
import { formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product, BoardMode } from "@shared/types";

function renderModeSwitch(current: BoardMode): { el: HTMLElement; getValue: () => BoardMode } {
  let mode: BoardMode = current;
  const kanbanBtn = el("button", {
    class: `segmented-btn${mode === "kanban" ? " segmented-btn--selected" : ""}`,
    type: "button"
  }, [icon("view_column"), "Kanban"]);
  const notesBtn = el("button", {
    class: `segmented-btn${mode === "notes" ? " segmented-btn--selected" : ""}`,
    type: "button"
  }, [icon("sticky_note_2"), "Notas"]);

  const select = (m: BoardMode): void => {
    mode = m;
    kanbanBtn.classList.toggle("segmented-btn--selected", m === "kanban");
    notesBtn.classList.toggle("segmented-btn--selected", m === "notes");
  };

  kanbanBtn.addEventListener("click", () => select("kanban"));
  notesBtn.addEventListener("click", () => select("notes"));

  const container = el("div", { class: "segmented-control" }, [kanbanBtn, notesBtn]);
  return { el: container, getValue: () => mode };
}

export function openProductSettings(product: Product): void {
  const showPriority = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  showPriority.checked = product.showPriority !== false;

  const autoPasteCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  autoPasteCb.checked = product.autoPasteLinks !== false;

  const showReviewCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  showReviewCb.checked = product.showReview !== false;

  const modeSwitch = renderModeSwitch(product.boardMode);

  const error = errorText();

  const submit = () => {
    try {
      productService.edit(product.id, {
        showPriority: showPriority.checked,
        autoPasteLinks: autoPasteCb.checked,
        showReview: showReviewCb.checked,
        boardMode: modeSwitch.getValue()
      });
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    el("label", { class: "field field--checkbox" }, [
      showPriority,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, ["Exibir prioridade das tarefas"]),
        el("span", { class: "field__description" }, ["Mostra indicadores de prioridade (baixa, média, alta, crítica) nos cards do quadro."])
      ])
    ]),
    el("label", { class: "field field--checkbox" }, [
      autoPasteCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, ["Colar link automaticamente"]),
        el("span", { class: "field__description" }, ["Ao adicionar um link, preenche automaticamente com o conteúdo da área de transferência."])
      ])
    ]),
    el("label", { class: "field field--checkbox" }, [
      showReviewCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, ["Exibir coluna Review"]),
        el("span", { class: "field__description" }, ["Mostra a coluna Review no quadro Kanban."])
      ])
    ]),
    el("label", { class: "field" }, [
      el("span", { class: "field__label" }, ["Modo do quadro"]),
      el("span", { class: "field__description" }, ["Kanban: colunas de status. Notas: layout livre com categorias."]),
      modeSwitch.el
    ]),
    error,
    formActions("Salvar", submit)
  ]);

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: "Configurações do Projeto", body });
}
