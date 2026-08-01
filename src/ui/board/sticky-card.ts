import { el, icon, clear, actionsMenu, MenuItem } from "@ui/components/dom";
import { Sticky } from "@shared/types";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { showConfirm, showAlert } from "@ui/components/dialog";
import { showToast } from "@ui/components/notification";
import { timeAgo, formatDate } from "@shared/utils";
import { t, localeDateTimeString } from "@shared/i18n";
import { openModal } from "@ui/modal";
import { openStickyForm } from "@ui/modal/sticky-form";

const expandedStickies = new Map<string, boolean>();

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seg = Math.floor(diff / 1000);
  if (seg < 60) return t("utils.agora");
  const min = Math.floor(seg / 60);
  if (min < 60) return t("utils.atrasMin", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("utils.atrasHora", { n: hr });
  const dias = Math.floor(hr / 24);
  if (dias < 30) return t("card.haTempo", { n: dias });
  return formatDate(iso);
}

function fullDateTime(iso: string): string {
  return localeDateTimeString(new Date(iso));
}

async function copyImageToClipboard(dataUrl: string, mimeType: string): Promise<void> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
    showToast(t("card.imageCopied"), "content_copy");
  } catch {
    showToast(t("card.erroCopiarImagem"), "error");
  }
}

function downloadImage(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openImageModal(dataUrl: string, filename: string, mimeType = "image/png"): void {
  const img = el("img", {
    class: "modal__image-full",
    src: dataUrl,
    alt: filename
  }) as HTMLImageElement;

  const copyBtn = el("button", { class: "modal__image-action", "aria-label": "Copiar imagem", type: "button" }, [
    icon("content_copy"), " Copiar"
  ]);
  copyBtn.addEventListener("click", () => copyImageToClipboard(dataUrl, mimeType));

  const downloadBtn = el("button", { class: "modal__image-action", "aria-label": "Download imagem", type: "button" }, [
    icon("download"), " Download"
  ]);
  downloadBtn.addEventListener("click", () => downloadImage(dataUrl, filename));

  const toolbar = el("div", { class: "modal__image-toolbar" }, [copyBtn, downloadBtn]);

  openModal({
    body: el("div", { class: "modal__image-body" }, [img, toolbar]),
    autoFocus: false,
    noHeader: true
  });

  const dialog = document.querySelector(".modal");
  if (dialog) dialog.classList.add("modal--image");
}

export function stickyCard(sticky: Sticky, readOnly: boolean): HTMLElement {
  const linkList = el("div", { class: "card__links" }, []);
  const commentList = el("div", { class: "card__links" }, []);
  const imageList = el("div", { class: "card__images" }, []);
  const body = el("div", { class: "sticky-card__body" }, []);

  const renderLinks = (): void => {
    clear(linkList);
    for (const link of sticky.links) {
      const displayUrl = link.url.replace(/^https?:\/\//, "");

      const linkBtn = el("a", {
        class: "card__link-btn",
        href: link.url,
        target: "_blank",
        rel: "noopener",
        "aria-label": t("card.abrirLink", { url: link.url })
      }, [icon("link")]);

      if (link.visitedAt) {
        linkBtn.classList.add("card__link-btn--visited");
        linkBtn.title = t("card.acessosInfo", { n: link.visitCount ?? 0, last: timeAgo(link.visitedAt) });
      }

      linkBtn.addEventListener("click", () => {
        stickyService.markLinkVisited(sticky.id, link.id);
      });

      const del = el("button", { class: "card__task-delete", "aria-label": t("card.excluirLink") }, [icon("close")]);
      del.disabled = readOnly;
      if (!readOnly) {
        del.addEventListener("click", () => {
          showConfirm(t("card.excluirLink"), displayUrl).then((ok) => {
            if (ok) stickyService.removeLink(sticky.id, link.id);
          });
        });
      }

      const count = (link.visitCount ?? 0) > 0
        ? el("span", {
          class: "card__link-count",
          "aria-label": t((link.visitCount ?? 0) === 1 ? "card.nAcesso" : "card.nAcessos", { n: link.visitCount ?? 0 }),
          title: t("card.acessosInfo", { n: link.visitCount ?? 0, last: timeAgo(link.visitedAt) })
        }, [
          icon("ads_click"),
          String(link.visitCount ?? 0)
        ])
        : null;

      linkList.append(
        el("div", { class: "card__task" }, [
          linkBtn,
          el("span", { class: "card__task-text" }, [displayUrl]),
          count,
          del
        ])
      );
    }
  };
  renderLinks();

  const renderComments = (): void => {
    clear(commentList);
    for (const c of sticky.comments) {
      const delBtn = el("button", { class: "card__task-delete", "aria-label": t("card.excluirComentario") }, [icon("close")]);
      delBtn.disabled = readOnly;
      if (!readOnly) {
        delBtn.addEventListener("click", () => {
          showConfirm(t("card.excluirComentario"), c.text).then((ok) => {
            if (ok) stickyService.removeComment(sticky.id, c.id);
          });
        });
      }

      const timeSpan = el("span", {
        class: "card__comment-time",
        title: c.updatedAt
          ? t("card.criadoEditado", { created: fullDateTime(c.createdAt), edited: fullDateTime(c.updatedAt) })
          : fullDateTime(c.createdAt)
      }, [relativeTime(c.updatedAt ?? c.createdAt)]);

      commentList.append(
        el("div", { class: "card__task" }, [
          el("span", { class: "card__comment-icon" }, [icon("chat")]),
          el("span", { class: "card__task-text" }, [c.text]),
          timeSpan,
          delBtn
        ])
      );
    }
  };
  renderComments();

  const renderImages = (): void => {
    clear(imageList);
    for (const img of sticky.images) {
      const thumb = el("img", {
        class: "card__image-thumb",
        src: img.dataUrl,
        alt: img.filename,
        loading: "lazy"
      }) as HTMLImageElement;

      const copyBtn = el("button", { class: "card__image-action", "aria-label": t("card.copiarImagem"), type: "button" }, [icon("content_copy")]);
      copyBtn.addEventListener("click", () => copyImageToClipboard(img.dataUrl, img.mimeType));

      const downloadBtn = el("button", { class: "card__image-action", "aria-label": t("card.downloadImagem"), type: "button" }, [icon("download")]);
      downloadBtn.addEventListener("click", () => downloadImage(img.dataUrl, img.filename));

      const delBtn = el("button", { class: "card__image-action card__image-action--delete", "aria-label": t("card.excluirImagem"), type: "button" }, [icon("delete")]);
      delBtn.disabled = readOnly;
      if (!readOnly) {
        delBtn.addEventListener("click", () => {
          showConfirm(t("card.excluirImagem"), img.filename).then((ok) => {
            if (ok) stickyService.removeImage(sticky.id, img.id);
          });
        });
      }

      const wrap = el("div", { class: "card__image-wrap" }, [thumb, el("div", { class: "card__image-actions" }, [copyBtn, downloadBtn, delBtn])]);
      thumb.addEventListener("click", () => openImageModal(img.dataUrl, img.filename, img.mimeType));
      imageList.append(wrap);
    }
  };
  renderImages();

  const hasText = Boolean((sticky.title ?? "").trim()) || Boolean((sticky.description ?? "").trim());
  const hasBodyContent = Boolean((sticky.description ?? "").trim()) || sticky.links.length > 0 || sticky.comments.length > 0 || sticky.images.length > 0;
  const hasContent = hasText || sticky.links.length > 0 || sticky.comments.length > 0 || sticky.images.length > 0;

  if (sticky.description) body.append(el("p", { class: "sticky-card__desc" }, [sticky.description]));
  body.append(linkList, commentList, imageList);
  if (!hasContent) {
    body.append(el("p", { class: "sticky-card__empty" }, [t("sticky.semConteudo")]));
  }

  let expandBtn: HTMLElement | undefined;

  const setExpanded = (isExpanded: boolean): void => {
    expandedStickies.set(sticky.id, isExpanded);
    body.classList.toggle("sticky-card__body--expanded", isExpanded);
    if (expandBtn) {
      expandBtn.replaceChildren(
        icon(isExpanded ? "expand_less" : "expand_more"),
        el("span", { class: "card__expand-btn-text" }, [isExpanded ? t("card.recolher") : t("card.expandir")])
      );
    }
  };

  const addLink = (): void => {
    if (linkList.querySelector(".card__subtask-add")) return;
    setExpanded(true);

    const urlInput = el("input", { class: "card__task-input", type: "text", placeholder: t("card.urlLink") }) as HTMLInputElement;

    const save = el("button", { class: "card__subtask-save", "aria-label": t("card.salvarLink"), type: "button" }, [
      icon("check")
    ]);

    const row = el("div", { class: "card__subtask-add" }, [urlInput, save]);

    let done = false;
    const commit = (): void => {
      if (done) return;
      const url = urlInput.value.trim();
      if (url) {
        done = true;
        stickyService.addLink(sticky.id, { url });
      }
    };
    const cancel = (): void => {
      done = true;
      row.remove();
    };

    urlInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") commit();
      else if (ev.key === "Escape") cancel();
    });
    urlInput.addEventListener("blur", () => setTimeout(() => !done && row.remove(), 150));
    save.addEventListener("mousedown", (ev) => ev.preventDefault());
    save.addEventListener("click", commit);

    linkList.append(row);
    urlInput.focus();
    if (productService.get(sticky.productId)?.autoPasteLinks !== false) {
      navigator.clipboard.readText().then((text) => {
        if (text) {
          urlInput.value = text;
          urlInput.setSelectionRange(text.length, text.length);
          commit();
        }
      }).catch(() => {});
    }
  };

  const addComment = (): void => {
    if (commentList.querySelector(".card__subtask-add")) return;
    setExpanded(true);

    const input = el("input", { class: "card__task-input", type: "text", placeholder: t("card.adicionarComentarioPH") }) as HTMLInputElement;
    const save = el("button", { class: "card__subtask-save", "aria-label": t("card.salvarComentario"), type: "button" }, [
      icon("check")
    ]);

    const row = el("div", { class: "card__subtask-add" }, [input, save]);

    let done = false;
    const commit = (): void => {
      if (done) return;
      const text = input.value.trim();
      if (text) {
        done = true;
        stickyService.addComment(sticky.id, { text });
      }
    };
    const cancel = (): void => {
      done = true;
      row.remove();
    };

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") commit();
      else if (ev.key === "Escape") cancel();
    });
    input.addEventListener("blur", () => setTimeout(() => !done && row.remove(), 150));
    save.addEventListener("mousedown", (ev) => ev.preventDefault());
    save.addEventListener("click", commit);

    commentList.append(row);
    input.focus();
  };

  const addImage = (): void => {
    const tryClipboard = (): void => {
      if (productService.get(sticky.productId)?.autoPasteImages === false) { openFilePicker(); return; }
      navigator.clipboard.read()
        .then((items) => {
          for (const clipItem of items) {
            const mime = clipItem.types.find((t) => t.startsWith("image/"));
            if (!mime) continue;
            clipItem.getType(mime).then((blob) => {
              const reader = new FileReader();
              reader.addEventListener("load", () => {
                setExpanded(true);
                stickyService.addImage(sticky.id, {
                  dataUrl: reader.result as string,
                  filename: `clipboard-${Date.now()}.png`,
                  mimeType: mime,
                  fileSize: blob.size
                });
              });
              reader.readAsDataURL(blob);
            });
            return;
          }
          openFilePicker();
        })
        .catch(() => openFilePicker());
    };

    const openFilePicker = (): void => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.hidden = true;
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setExpanded(true);
          stickyService.addImage(sticky.id, {
            dataUrl: reader.result as string,
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size
          });
        });
        reader.readAsDataURL(file);
      });
      document.body.append(input);
      input.click();
      input.remove();
    };

    tryClipboard();
  };

  const convertToTask = (): void => {
    showConfirm(t("sticky.converterTarefaAviso")).then((ok) => {
      if (!ok) return;
      try {
        const item = backlogService.convertFromSticky(sticky.id);
        const cardEl = document.querySelector<HTMLElement>(`.card[data-id="${item.id}"]`);
        if (cardEl) {
          cardEl.classList.add("card--just-moved");
          setTimeout(() => cardEl.classList.remove("card--just-moved"), 500);
        }
      } catch (e) {
        showAlert((e as Error).message);
      }
    });
  };

  const menuItems: MenuItem[] = [];
  if (!readOnly) {
    menuItems.push({
      label: t("sticky.editarNota"),
      icon: "edit",
      action: () => openStickyForm({ productId: sticky.productId, sticky })
    });
    menuItems.push({
      label: t("sticky.converterTarefa"),
      icon: "checklist",
      action: convertToTask
    });
  }
  menuItems.push({
    label: t("sticky.excluir"),
    icon: "delete",
    danger: true,
    action: () => {
      showConfirm(t("sticky.excluirConfirm")).then((ok) => {
        if (ok) stickyService.delete(sticky.id);
      });
    }
  });

  const menu = actionsMenu(menuItems);

  const badges = el("div", { class: "sticky-card__badges" }, [
    badge("link", sticky.links.length, t("sticky.nLinks", { n: sticky.links.length })),
    badge("chat", sticky.comments.length, t("sticky.nComentarios", { n: sticky.comments.length })),
    badge("image", sticky.images.length, t("sticky.nImagens", { n: sticky.images.length }))
  ]);

  function badge(iconName: string, count: number, label: string): HTMLElement {
    const b = el("button", {
      class: `sticky-badge${count === 0 ? " sticky-badge--empty" : ""}`,
      type: "button",
      "aria-label": label,
      title: label
    }, [icon(iconName), el("span", { class: "sticky-badge__count" }, [String(count)])]);
    b.addEventListener("click", () => {
      const isExpanded = !expandedStickies.get(sticky.id);
      setExpanded(isExpanded);
    });
    return b;
  }

  const bodyExpanded = expandedStickies.get(sticky.id) === true;
  if (bodyExpanded) body.classList.add("sticky-card__body--expanded");

  const footer = el("div", { class: "card__footer sticky-card__footer" }, []);

  if (hasBodyContent) {
    const btn = el("button", { class: "card__expand-btn", type: "button" }, [
      icon(bodyExpanded ? "expand_less" : "expand_more"),
      el("span", { class: "card__expand-btn-text" }, [bodyExpanded ? t("card.recolher") : t("card.expandir")])
    ]);
    expandBtn = btn;
    btn.addEventListener("click", () => {
      const isExpanded = !expandedStickies.get(sticky.id);
      setExpanded(isExpanded);
    });
    footer.append(btn);
  }

  if (!readOnly) {
    const actionsFooter = el("div", { class: "card__footer-actions" }, [
      actionBtn("link", t("card.adicionarLink"), addLink),
      actionBtn("chat", t("card.adicionarComentario"), addComment),
      actionBtn("add_photo_alternate", t("card.adicionarImagem"), addImage)
    ]);
    footer.append(actionsFooter);
  }

  function actionBtn(iconName: string, label: string, action: () => void): HTMLElement {
    const btn = el("button", {
      class: "card__action-btn",
      type: "button",
      "aria-label": label,
      title: label
    }, [icon(iconName)]);
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      action();
    });
    return btn;
  }

  const titleEl = el("h3", { class: "sticky-card__title" }, [sticky.title || t("sticky.semTitulo")]);
  if (!sticky.title) titleEl.classList.add("sticky-card__title--empty");

  const card = el("article", {
    class: `card sticky-card${readOnly ? " card--locked" : ""}`,
    "data-id": sticky.id
  }, [
    el("div", { class: "sticky-card__top" }, [badges, menu]),
    titleEl,
    body,
    footer
  ]);

  card.addEventListener("dblclick", (ev) => {
    if ((ev.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    if (!hasContent) return;
    const isExpanded = !expandedStickies.get(sticky.id);
    setExpanded(isExpanded);
  });

  return card;
}
