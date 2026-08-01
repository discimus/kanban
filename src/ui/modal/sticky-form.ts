import { el } from "@ui/components/dom";
import { field, textInput, textArea, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { Sticky } from "@shared/types";
import { t } from "@shared/i18n";

export interface StickyFormTarget {
  productId: string;
  sticky?: Sticky;
}

export function openStickyForm({ productId, sticky }: StickyFormTarget): void {
  const title = textInput(sticky?.title ?? "", t("form.titulo"));
  const description = textArea(sticky?.description ?? "", t("form.descricao"));
  const error = errorText();

  const submit = () => {
    const titleValue = title.value.trim();
    if (!titleValue) {
      error.textContent = t("sticky.tituloObrigatorio");
      title.focus();
      return;
    }
    try {
      if (sticky) {
        stickyService.updateContent(sticky.id, { title: titleValue, description: description.value });
      } else {
        const created = stickyService.create({ productId, title: titleValue, description: description.value });
        const cardEl = document.querySelector<HTMLElement>(`.sticky-card[data-id="${created.id}"]`);
        if (cardEl) {
          cardEl.classList.add("card--just-moved");
          setTimeout(() => cardEl.classList.remove("card--just-moved"), 500);
        }
      }
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field(t("form.titulo"), title),
    field(t("form.descricao"), description),
    error,
    formActions(t("form.salvar"), submit)
  ]);

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: sticky ? t("sticky.editarNota") : t("sticky.novoCard"), body });
}
