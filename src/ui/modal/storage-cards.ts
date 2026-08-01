import { el, icon, clear } from "@ui/components/dom";
import { closeModal } from "../modal";
import { store } from "@shared/storage";
import { getCardsWithMedia, type CardsWithMediaEntry, type StorageMediaType } from "@shared/storage/storage-usage";
import { setupScrollFade, updateScrollFade } from "@ui/components/scroll-fade";
import { t } from "@shared/i18n";

const FILTERS: { value: StorageMediaType; labelKey: string; icon: string }[] = [
  { value: "all", labelKey: "storage.filtroTodos", icon: "folder_open" },
  { value: "images", labelKey: "storage.filtroImagens", icon: "image" },
  { value: "audio", labelKey: "storage.filtroAudios", icon: "graphic_eq" }
];

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function renderRow({ product, item, images, audios }: CardsWithMediaEntry): HTMLElement {
  const hasImages = images.length > 0;

  const thumbWrap = hasImages
    ? el("span", { class: "storage-card__thumb-wrap" }, [
        el("img", { class: "storage-card__thumb", src: images[0].dataUrl, alt: images[0].filename, decoding: "async" })
      ])
    : el("span", { class: "storage-card__thumb-wrap storage-card__thumb-wrap--audio", "aria-hidden": "true" }, [
        el("span", { class: "storage-card__thumb-icon" }, [
          icon("graphic_eq"),
          el("span", { class: "storage-card__thumb-duration" }, [formatDuration(audios[0].duration)])
        ])
      ]);

  const count = el("span", { class: "storage-card__count" }, []);
  if (hasImages) {
    count.append(el("span", { class: "storage-card__count-item" }, [icon("image"), String(images.length)]));
  }
  if (audios.length > 0) {
    count.append(el("span", { class: "storage-card__count-item" }, [icon("graphic_eq"), String(audios.length)]));
  }

  const row = el("button", { class: "storage-card", type: "button" }, [
    thumbWrap,
    el("span", { class: "storage-card__info" }, [
      el("span", { class: "storage-card__title" }, [item.title || t("storage.semTitulo")]),
      el("span", { class: "storage-card__product" }, [product.name])
    ]),
    count
  ]);
  row.addEventListener("click", () => {
    closeModal();
    import("../../app/view").then(({ focusProductCard }) => {
      focusProductCard(product.id, item.id, document.getElementById("app")!);
    });
  });
  return row;
}

function renderEmpty(filter: StorageMediaType): HTMLElement {
  const key =
    filter === "audio" ? "storage.semCardsAudios"
    : filter === "images" ? "storage.semCardsImagens"
    : "storage.semCards";
  return el("div", { class: "storage-cards__empty" }, [
    icon(filter === "audio" ? "graphic_eq" : "image_search"),
    el("p", {}, [t(key)])
  ]);
}

/**
 * Fills the storage media modal body (already open with a loading state) with
 * the type filters and the list of cards holding media. Called after the lazy
 * chunk resolves so the user sees feedback the moment they click STORAGE.
 */
export function fillStorageCardsModal(body: HTMLElement): void {
  const state = store.getState();
  let filter: StorageMediaType = "all";

  const filters = el("div", { class: "storage-cards__filters", role: "group", "aria-label": t("storage.filtroPorTipo") }, []);
  const list = el("div", { class: "storage-cards" }, []);

  const allEntries = getCardsWithMedia(state, "all");
  const counts: Record<StorageMediaType, number> = { all: allEntries.length, images: 0, audio: 0 };
  for (const e of allEntries) {
    if (e.images.length > 0) counts.images += 1;
    if (e.audios.length > 0) counts.audio += 1;
  }

  const render = (): void => {
    clear(filters);
    for (const f of FILTERS) {
      const chip = el("button", {
        class: `chip chip--filter${filter === f.value ? " chip--selected" : ""}`,
        type: "button",
        "aria-pressed": String(filter === f.value),
        "data-type": f.value
      }, [icon(f.icon), `${t(f.labelKey)} (${counts[f.value]})`]);
      chip.addEventListener("click", () => {
        if (filter === f.value) return;
        filter = f.value;
        render();
      });
      filters.append(chip);
    }

    clear(list);
    const entries = filter === "all" ? allEntries : getCardsWithMedia(state, filter);
    if (entries.length === 0) {
      list.append(renderEmpty(filter));
    } else {
      for (const entry of entries) list.append(renderRow(entry));
    }
    updateScrollFade(list);
  };

  render();
  setupScrollFade(list);

  clear(body);
  body.append(el("div", { class: "storage-cards__modal" }, [filters, list]));
}
