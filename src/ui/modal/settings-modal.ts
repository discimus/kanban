import { el } from "@ui/components/dom";
import { formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product } from "@shared/types";

export function openProductSettings(product: Product): void {
  const isNotes = product.category === "notes";

  const showPriority = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  showPriority.checked = product.showPriority !== false;

  const autoPasteCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  autoPasteCb.checked = product.autoPasteLinks !== false;

  const showReviewCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  showReviewCb.checked = product.showReview !== false;

  const error = errorText();

  const submit = () => {
    try {
      productService.edit(product.id, {
        ...(!isNotes && { showPriority: showPriority.checked }),
        ...(!isNotes && { showReview: showReviewCb.checked }),
        autoPasteLinks: autoPasteCb.checked,
      });
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    ...(isNotes ? [] : [el("label", { class: "field field--checkbox" }, [
      showPriority,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, ["Exibir prioridade das tarefas"]),
        el("span", { class: "field__description" }, ["Mostra indicadores de prioridade (baixa, média, alta, crítica) nos cards do quadro."])
      ])
    ])]),
    el("label", { class: "field field--checkbox" }, [
      autoPasteCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, ["Colar link automaticamente"]),
        el("span", { class: "field__description" }, ["Ao adicionar um link, preenche automaticamente com o conteúdo da área de transferência."])
      ])
    ]),
    ...(isNotes ? [] : [el("label", { class: "field field--checkbox" }, [
      showReviewCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, ["Exibir coluna Review"]),
        el("span", { class: "field__description" }, ["Mostra a coluna Review no quadro Kanban."])
      ])
    ])]),
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
