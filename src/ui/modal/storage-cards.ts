import { el, icon } from "@ui/components/dom";
import { openModal, closeModal } from "../modal";
import { store } from "@shared/storage";
import { getCardsWithImages } from "@shared/storage/storage-usage";
import { t } from "@shared/i18n";

export function openStorageCardsModal(): void {
  const entries = getCardsWithImages(store.getState());

  let body: HTMLElement;

  if (entries.length === 0) {
    body = el("div", { class: "storage-cards__empty" }, [
      icon("image_search"),
      el("p", {}, [t("storage.semCards")])
    ]);
  } else {
    const list = el("div", { class: "storage-cards" }, entries.map(({ product, item, images }) => {
      const row = el("button", { class: "storage-card", type: "button" }, [
        el("span", { class: "storage-card__thumb-wrap" }, [
          el("img", { class: "storage-card__thumb", src: images[0].dataUrl, alt: images[0].filename })
        ]),
        el("span", { class: "storage-card__info" }, [
          el("span", { class: "storage-card__title" }, [item.title || t("storage.semTitulo")]),
          el("span", { class: "storage-card__product" }, [product.name])
        ]),
        el("span", { class: "storage-card__count" }, [
          icon("image"),
          String(images.length)
        ])
      ]);
      row.addEventListener("click", () => {
        closeModal();
        import("../../app/view").then(({ focusProductCard }) => {
          focusProductCard(product.id, item.id, document.getElementById("app")!);
        });
      });
      return row;
    }));
    body = list;
  }

  openModal({ title: t("storage.cardsComImagens"), body });
}
