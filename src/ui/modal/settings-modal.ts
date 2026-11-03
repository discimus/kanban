import { el } from "@ui/components/dom";
import { formActions, errorText, paletteSelector, select } from "@ui/components/forms";
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

  const reviewAutoDoneSel = select(
    [
      { value: "", label: t("form.nunca") },
      { value: "1", label: t("form.umDia") },
      { value: "3", label: t("form.tresDias") },
      { value: "7", label: t("form.seteDias") },
      { value: "14", label: t("form.catorzeDias") },
      { value: "30", label: t("form.trintaDias") }
    ],
    product.reviewAutoDoneDays != null ? String(product.reviewAutoDoneDays) : ""
  );

  const reviewAutoField = el("label", { class: "field" }, [
    el("span", { class: "field__label" }, [t("settings.reviewAutoDoneAfter")]),
    reviewAutoDoneSel,
    el("span", { class: "field__description" }, [t("settings.reviewAutoDoneDesc")])
  ]);

  const syncReviewAuto = (): void => {
    reviewAutoField.style.display = showReviewCb.checked ? "" : "none";
  };

  showReviewCb.addEventListener("change", syncReviewAuto);
  syncReviewAuto();

  const error = errorText();
  const pal = paletteSelector(product.palette);

  const submit = () => {
    try {
      productService.edit(product.id, {
        ...(!isNotes && { showPriority: showPriority.checked }),
        ...(!isNotes && { showReview: showReviewCb.checked }),
        ...(!isNotes && { reviewAutoDoneDays: reviewAutoDoneSel.value ? Number(reviewAutoDoneSel.value) : null }),
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
    ...(isNotes ? [] : [reviewAutoField]),
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
