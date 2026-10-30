import { el, flashCard } from "@ui/components/dom";
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

  const linkInputs: { linkId: string; original: string; input: HTMLInputElement }[] = [];
  const linksSection = sticky ? buildLinksSection(sticky, linkInputs) : null;

  const commentInputs: { commentId: string; original: string; input: HTMLInputElement }[] = [];
  const commentsSection = sticky ? buildCommentsSection(sticky, commentInputs) : null;

  const submit = () => {
    const titleValue = title.value.trim();
    if (!titleValue) {
      error.textContent = t("sticky.tituloObrigatorio");
      title.focus();
      return;
    }
    try {
      if (sticky) {
        for (const { linkId, original, input } of linkInputs) {
          const value = input.value.trim();
          if (value && value !== original) stickyService.changeLinkUrl(sticky.id, linkId, value);
        }
        for (const { commentId, original, input } of commentInputs) {
          const value = input.value.trim();
          if (value && value !== original) stickyService.editComment(sticky.id, commentId, value);
        }
        stickyService.updateContent(sticky.id, { title: titleValue, description: description.value });
      } else {
        const created = stickyService.create({ productId, title: titleValue, description: description.value });
        flashCard(created.id);
      }
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field(t("form.titulo"), title),
    field(t("form.descricao"), description),
    linksSection,
    commentsSection,
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

function buildLinksSection(
  sticky: Sticky,
  linkInputs: { linkId: string; original: string; input: HTMLInputElement }[]
): HTMLElement | null {
  if (sticky.links.length === 0) return null;

  const rows = sticky.links.map((link) => {
    const input = textInput(link.url, t("form.url"));
    linkInputs.push({ linkId: link.id, original: link.url, input });
    return input;
  });

  return el("div", { class: "field" }, [
    el("span", { class: "field__label" }, [t("form.links")]),
    ...rows
  ]);
}

function buildCommentsSection(
  sticky: Sticky,
  commentInputs: { commentId: string; original: string; input: HTMLInputElement }[]
): HTMLElement | null {
  if (sticky.comments.length === 0) return null;

  const rows = sticky.comments.map((comment) => {
    const input = textInput(comment.text, t("form.editarComentario"));
    commentInputs.push({ commentId: comment.id, original: comment.text, input });
    return input;
  });

  return el("div", { class: "field" }, [
    el("span", { class: "field__label" }, [t("form.comentarios")]),
    ...rows
  ]);
}
