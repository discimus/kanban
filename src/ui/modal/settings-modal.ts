import { el } from "@ui/components/dom";
import { formActions, errorText, paletteSelector } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product } from "@shared/types";
import { t } from "@shared/i18n";

export function openProductSettings(product: Product): void {
  const isNotes = product.category === "notes";

  const showPriority = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  showPriority.checked = product.showPriority !== false;

  const autoPasteCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  autoPasteCb.checked = product.autoPasteLinks !== false;

  const autoPasteImageCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  autoPasteImageCb.checked = product.autoPasteImages !== false;

  const showReviewCb = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  showReviewCb.checked = product.showReview !== false;

  const error = errorText();
  const pal = paletteSelector(product.palette);

  const submit = () => {
    try {
      productService.edit(product.id, {
        ...(!isNotes && { showPriority: showPriority.checked }),
        ...(!isNotes && { showReview: showReviewCb.checked }),
        autoPasteLinks: autoPasteCb.checked,
        autoPasteImages: autoPasteImageCb.checked,
        palette: pal.value
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
        el("span", { class: "field__label" }, [t("settings.exibirPrioridade")]),
        el("span", { class: "field__description" }, [t("settings.exibirPrioridadeDesc")])
      ])
    ])]),
    el("label", { class: "field field--checkbox" }, [
      autoPasteCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, [t("settings.colarLink")]),
        el("span", { class: "field__description" }, [t("settings.colarLinkDesc")])
      ])
    ]),
    el("label", { class: "field field--checkbox" }, [
      autoPasteImageCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, [t("settings.colarImagem")]),
        el("span", { class: "field__description" }, [t("settings.colarImagemDesc")])
      ])
    ]),
    ...(isNotes ? [] : [el("label", { class: "field field--checkbox" }, [
      showReviewCb,
      el("span", { class: "field__text-wrapper" }, [
        el("span", { class: "field__label" }, [t("settings.exibirReview")]),
        el("span", { class: "field__description" }, [t("settings.exibirReviewDesc")])
      ])
    ])]),
    el("label", { class: "field" }, [
      el("span", { class: "field__label" }, [t("palette.label")]),
      pal.element,
      el("span", { class: "field__description" }, [t("palette.desc")])
    ]),
    error,
    formActions(t("form.salvar"), submit)
  ]);

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: t("settings.title"), body });
}
