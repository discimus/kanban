import { el, icon, clear, actionsMenu, MenuItem, flashCard, flashItem } from "@ui/components/dom";
import { BacklogItem, PRIORITIES, KANBAN_COLUMNS, CATEGORY_CLASSIFICATIONS, TaskClassification, ProductCategory, Task } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { linkService } from "@contexts/link/application/link.service";
import { commentService } from "@contexts/comment/application/comment.service";
import { imageService } from "@contexts/image/application/image.service";
import { audioService } from "@contexts/audio/application/audio.service";
import { extensionForMimeType, MicPermissionError, type RecordedAudio } from "@ui/recorder/audio-recorder";
import { createInlineRecorder, renderRecordingControl, renderRecorderTimer } from "@ui/recorder/inline-recorder";
import { createAudioPlayer } from "@ui/recorder/audio-player";
import { releaseAudioPlaybackUrl } from "@ui/recorder/audio-url";
import { eventBus } from "@shared/events";
import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { showAlert, showConfirm } from "@ui/components/dialog";
import { showToast } from "@ui/components/notification";
import { timeAgo, formatDate } from "@shared/utils";
import { t, loc, localeDateTimeString } from "@shared/i18n";
import { openModal, closeModal } from "../modal";
import { field, select, errorText } from "@ui/components/forms";

function priorityLabel(p: BacklogItem["priority"]): string {
  const found = PRIORITIES.find((x) => x.value === p);
  return found ? loc(found) : p;
}

function classificationLabel(c: TaskClassification, category: ProductCategory): string {
  const found = CATEGORY_CLASSIFICATIONS[category].find((x) => x.value === c);
  return found ? loc(found) : c;
}

function classificationIcon(c: TaskClassification, category: ProductCategory): string {
  return CATEGORY_CLASSIFICATIONS[category].find((x) => x.value === c)?.icon ?? "help";
}

function openMoveToProjectDialog(item: BacklogItem): void {
  const projects = productService.list().filter(p => p.id !== item.productId);
  if (projects.length === 0) {
    showAlert(t("card.naoHaProjetos"));
    return;
  }

  const sel = select(
    projects.map(p => ({ value: p.id, label: p.name })),
    ""
  );

  const error = errorText();
  const body = el("div", { class: "form" }, [
    el("p", { style: "margin-bottom: 12px; color: var(--text-secondary);" }, [t("card.moverPara", { title: item.title })]),
    field(t("card.projetoDestino"), sel),
    error
  ]);

  const cancelBtn = el("button", { class: "btn", type: "button" }, [t("card.cancelar")]);
  const moveBtn = el("button", { class: "btn btn--primary", type: "button" }, [t("card.mover")]);

  const actions = el("div", { class: "form__actions" }, [cancelBtn, moveBtn]);
  body.append(actions);

  cancelBtn.addEventListener("click", closeModal);
  moveBtn.addEventListener("click", () => {
    if (!sel.value) {
      error.textContent = t("card.selecioneProjeto");
      return;
    }
    try {
      backlogService.changeProduct(item.id, sel.value);
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  });

  openModal({ title: t("card.moverCard"), body });
}

const FIBONACCI = [1, 2, 3, 5, 8];

function nextFibonacci(current: number): number {
  const idx = FIBONACCI.indexOf(current);
  if (idx === -1 || idx === FIBONACCI.length - 1) return FIBONACCI[0];
  return FIBONACCI[idx + 1];
}

function cardActionBtn(iconName: string, label: string, action: () => void): HTMLElement {
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

const expandedCards = new Map<string, boolean>();

const recorder = createInlineRecorder({
  onStarted: () => eventBus.emit("ui:refresh"),
  onError: (_id, e) => {
    if (e instanceof MicPermissionError) showAlert(t("audio.permissaoNegada"));
    else showAlert(t("audio.erroGravar"));
  }
});

function saveStoppedRecording(itemId: string, result: RecordedAudio): void {
  expandedCards.set(itemId, true);
  try {
    const created = audioService.create({
      backlogItemId: itemId,
      dataUrl: result.dataUrl,
      filename: `audio-${Date.now()}.${extensionForMimeType(result.mimeType)}`,
      mimeType: result.mimeType,
      fileSize: result.fileSize,
      duration: result.duration
    });
    flashItem(created.id);
  } catch {
    showToast(t("audio.erroSalvar"), "error");
  }
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

async function copyCardTitle(title: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(title);
    showToast(t("card.titleCopied"), "content_copy");
  } catch {
    showToast(t("card.erroCopiarTitulo"), "error");
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

  const body = el("div", { class: "modal__image-body" }, [img, toolbar]);

  openModal({
    body,
    autoFocus: false,
    noHeader: true
  });

  const dialog = document.querySelector(".modal");
  if (dialog) dialog.classList.add("modal--image");
}

export function backlogCard(item: BacklogItem, locked = false, showPriority = true, category: ProductCategory = "development", minimal = false): HTMLElement {
  const isArchived = !!item.archivedAt;
  const recording = recorder.getActive(item.id);
  const readOnly = locked || isArchived;
  const taskList = el("div", { class: "card__tasks" }, []);

  const renderTasks = (taskItems: Task[]): void => {
    clear(taskList);
    for (const task of taskItems) {
      const done = task.status === "done";

      const checkbox = el("input", { class: "card__task-check", type: "checkbox" }) as HTMLInputElement;
      checkbox.checked = done;
      checkbox.disabled = readOnly;
      if (!readOnly) {
        checkbox.addEventListener("change", () => {
          taskService.changeStatus(task.id, checkbox.checked ? "done" : "todo");
        });
      }

      const del = el("button", { class: "card__task-delete", "aria-label": t("card.excluirSubtarefa") }, [icon("close")]);
      del.disabled = readOnly;
      if (!readOnly) {
        del.addEventListener("click", () => {
          showConfirm(t("card.excluirSubtarefa"), task.title).then((ok) => {
            if (ok) taskService.delete(task.id);
          });
        });
      }

      taskList.append(
        el("div", { class: `card__task${done ? " card__task--done" : ""}`, "data-id": task.id, tabindex: "-1" }, [
          checkbox,
          el("span", { class: "card__task-text" }, [task.title]),
          del
        ])
      );
    }
  };

  const tasks = taskService.byBacklogItem(item.id);
  renderTasks(tasks);

  const doneCount = tasks.filter((t) => t.status === "done").length;

  const progressBar = tasks.length > 0
    ? el("div", { class: "card__progress" }, [
        el("div", { class: "card__progress-bar" }, [
          el("div", { class: `card__progress-fill${doneCount === tasks.length ? " card__progress-fill--complete" : ""}`, style: `width:${(doneCount / tasks.length) * 100}%` })
        ]),
        el("span", {}, [`${doneCount}/${tasks.length}`])
      ])
    : null;

  const linkList = el("div", { class: "card__links" }, []);

  const renderLinks = (): void => {
    clear(linkList);
    const links = linkService.byBacklogItem(item.id);
    for (const link of links) {
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
        linkService.markAsVisited(link.id);
      });

      const del = el("button", { class: "card__task-delete", "aria-label": t("card.excluirLink") }, [icon("close")]);
      del.disabled = readOnly;
      if (!readOnly) {
        del.addEventListener("click", () => {
          showConfirm(t("card.excluirLink"), displayUrl).then((ok) => {
            if (ok) linkService.delete(link.id);
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
        el("div", { class: "card__task", "data-id": link.id }, [
          linkBtn,
          el("span", { class: "card__task-text" }, [displayUrl]),
          count,
          del
        ])
      );
    }
  };
  renderLinks();

  let expandBtn: HTMLElement | undefined;

  const addLink = (): void => {
    if (linkList.querySelector(".card__subtask-add")) return;
    if (!cardBody.classList.contains("card__body--expanded")) {
      expandedCards.set(item.id, true);
      cardBody.classList.add("card__body--expanded");
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, [t("card.recolher")]));
    }

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
        const created = linkService.create({ backlogItemId: item.id, url });
        flashItem(created.id);
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
    if (productService.get(item.productId)?.autoPasteLinks !== false) {
      navigator.clipboard.readText().then((text) => {
        if (text) {
          urlInput.value = text;
          urlInput.setSelectionRange(text.length, text.length);
          commit();
        }
      }).catch(() => {});
    }
  };

  const addSubtask = (): void => {
    if (taskList.querySelector(".card__subtask-add")) return;
    if (!cardBody.classList.contains("card__body--expanded")) {
      expandedCards.set(item.id, true);
      cardBody.classList.add("card__body--expanded");
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, [t("card.recolher")]));
    }

    const input = el("input", { class: "card__task-input", type: "text", placeholder: t("card.novaSubtarefa") }) as HTMLInputElement;

    const save = el("button", { class: "card__subtask-save", "aria-label": t("card.salvarSubtarefa"), type: "button" }, [
      icon("check")
    ]);

    const row = el("div", { class: "card__subtask-add" }, [input, save]);

    let done = false;
    const commit = (): void => {
      if (done) return;
      const title = input.value.trim();
      if (title) {
        done = true;
        const created = taskService.create({ backlogItemId: item.id, title });
        flashItem(created.id);
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

    taskList.append(row);
    input.focus();
  };

  const commentList = el("div", { class: "card__links" }, []);
  const imageList = el("div", { class: "card__images" }, []);

  const renderImages = (): void => {
    clear(imageList);
    const images = imageService.byBacklogItem(item.id);
    for (const img of images) {
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
            if (ok) imageService.delete(img.id);
          });
        });
      }

      const actions = el("div", { class: "card__image-actions" }, [copyBtn, downloadBtn, delBtn]);
      const wrap = el("div", { class: "card__image-wrap", "data-id": img.id }, [thumb, actions]);
      thumb.addEventListener("click", () => openImageModal(img.dataUrl, img.filename, img.mimeType));
      imageList.append(wrap);
    }
  };
  renderImages();

  const audioList = el("div", { class: "card__audios" }, []);

  const renderAudios = (): void => {
    const audios = audioService.byBacklogItem(item.id);
    for (const a of audios) releaseAudioPlaybackUrl(a.dataUrl);
    clear(audioList);
    for (const a of audios) {
      const { player, playBtn, progressBar, durationEl } = createAudioPlayer(a.dataUrl, () => showToast(t("audio.erroGravar"), "error"), a.duration);

      const downloadBtn = el("button", { class: "card__audio-action", "aria-label": t("card.downloadAudio"), type: "button" }, [icon("download")]);
      downloadBtn.addEventListener("click", () => downloadImage(a.dataUrl, a.filename));

      const delBtn = el("button", { class: "card__audio-action card__audio-action--delete", "aria-label": t("card.excluirAudio"), type: "button" }, [icon("delete")]);
      delBtn.disabled = readOnly;
      if (!readOnly) {
        delBtn.addEventListener("click", () => {
          showConfirm(t("card.excluirAudio"), a.filename).then((ok) => {
            if (ok) {
              audioService.delete(a.id);
              releaseAudioPlaybackUrl(a.dataUrl);
            }
          });
        });
      }

      audioList.append(
        el("div", { class: "card__audio", "data-id": a.id }, [
          playBtn,
          el("span", { class: "card__audio-name" }, [a.filename]),
          durationEl,
          player,
          downloadBtn,
          delBtn,
          progressBar
        ])
      );
    }
  };
  renderAudios();

  const renderComments = (): void => {
    clear(commentList);
    const comments = commentService.byBacklogItem(item.id);
    for (const c of comments) {
      const delBtn = el("button", { class: "card__task-delete", "aria-label": t("card.excluirComentario") }, [icon("close")]);
      delBtn.disabled = readOnly;
      if (!readOnly) {
        delBtn.addEventListener("click", () => {
          showConfirm(t("card.excluirComentario"), c.text).then((ok) => {
            if (ok) commentService.delete(c.id);
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
        el("div", { class: "card__task", "data-id": c.id }, [
          el("span", { class: "card__comment-icon" }, [icon("chat")]),
          el("span", { class: "card__task-text" }, [c.text]),
          timeSpan,
          delBtn
        ])
      );
    }
  };
  renderComments();

  const addComment = (): void => {
    if (commentList.querySelector(".card__subtask-add")) return;
    if (!cardBody.classList.contains("card__body--expanded")) {
      expandedCards.set(item.id, true);
      cardBody.classList.add("card__body--expanded");
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, [t("card.recolher")]));
    }

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
        const created = commentService.create({ backlogItemId: item.id, text });
        flashItem(created.id);
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
    const expandCard = (): void => {
      if (cardBody.classList.contains("card__body--expanded")) return;
      expandedCards.set(item.id, true);
      cardBody.classList.add("card__body--expanded");
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, [t("card.recolher")]));
    };

    const tryClipboard = (): void => {
      if (productService.get(item.productId)?.autoPasteImages === false) { openFilePicker(); return; }
      navigator.clipboard.read()
        .then((items) => {
          for (const clipItem of items) {
            const mime = clipItem.types.find((t) => t.startsWith("image/"));
            if (!mime) continue;
            clipItem.getType(mime).then((blob) => {
              const reader = new FileReader();
              reader.addEventListener("load", () => {
                expandCard();
                const created = imageService.create({
                  backlogItemId: item.id,
                  dataUrl: reader.result as string,
                  filename: `clipboard-${Date.now()}.png`,
                  mimeType: mime,
                  fileSize: blob.size
                });
                flashItem(created.id);
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
          expandCard();
          const created = imageService.create({
            backlogItemId: item.id,
            dataUrl: reader.result as string,
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size
          });
          flashItem(created.id);
        });
        reader.readAsDataURL(file);
      });
      document.body.append(input);
      input.click();
      input.remove();
    };

    tryClipboard();
  };

  const lockedAlert = (): void => {
    showAlert(t("card.projetoLocked"));
  };

  const convertToNote = (item: BacklogItem): void => {
    showConfirm(t("card.converterNotaAviso"), t("card.converterNotaPerdidos")).then((ok) => {
      if (!ok) return;
      try {
        const sticky = stickyService.convertFromBacklog(item.id);
        flashCard(sticky.id);
      } catch (e) {
        showAlert((e as Error).message);
      }
    });
  };

  const moveTo = (status: (typeof KANBAN_COLUMNS)[number]["status"]): void => {
    try {
      backlogService.move(item.id, status);
    } catch (e) {
      showAlert((e as Error).message);
    }
  };

  const isNotes = category === "notes";
  const showReview = productService.get(item.productId)?.showReview !== false;
  const columnSubmenu: MenuItem[] = KANBAN_COLUMNS
    .filter((col) => col.status !== "review" || showReview)
    .map((col) => ({
    label: col.label,
    icon: col.icon,
    checked: col.status === item.status,
    disabled: col.status === item.status,
    action: locked ? lockedAlert : () => moveTo(col.status)
  }));

  const menu = actionsMenu(
    isArchived
      ? [
          {
            label: t("card.restaurar"),
            icon: "restore",
            action: () => backlogService.restore(item.id)
          },
          {
            label: t("card.excluir"),
            icon: "delete",
            danger: true,
            action: () => {
              showConfirm(t("card.excluirItem"), item.title).then((ok) => {
                if (ok) backlogService.delete(item.id);
              });
            }
          }
        ]
      : [
          {
            label: t("card.editar"),
            icon: "edit",
            action: locked ? lockedAlert : () => openBacklogForm(item.productId, item)
          },
          { label: t("card.adicionar"), icon: "add", submenu: [
            { label: t("card.subtarefa"), icon: "playlist_add", action: locked ? lockedAlert : addSubtask },
            { label: t("card.comentario"), icon: "chat", action: locked ? lockedAlert : addComment },
            { label: t("card.link"), icon: "link", action: locked ? lockedAlert : addLink },
            { label: t("card.imagem"), icon: "add_photo_alternate", action: locked ? lockedAlert : addImage },
            { label: t("card.audio"), icon: "mic", action: locked ? lockedAlert : () => recorder.start(item.id, (r) => saveStoppedRecording(item.id, r)) }
          ]},
          {
            label: t("card.copiarTitulo"),
            icon: "content_copy",
            action: () => copyCardTitle(item.title)
          },
          ...(isNotes ? [] : [{ label: t("card.moverParaColuna"), icon: "swap_horiz", submenu: columnSubmenu }]),
          {
            label: t("card.moverParaProjeto"),
            icon: "output",
            action: locked ? lockedAlert : () => openMoveToProjectDialog(item)
          },
          ...(isNotes ? [] : [{
            label: t("card.converterNota"),
            icon: "sticky_note_2",
            action: locked ? lockedAlert : () => convertToNote(item)
          }]),
          { label: t("card.arquivar"), icon: "archive", action: () => backlogService.archive(item.id) },
          {
            label: t("card.excluir"),
            icon: "delete",
            danger: true,
            action: locked
              ? lockedAlert
              : () => {
                  showConfirm(t("card.excluirItem"), item.title).then((ok) => {
                    if (ok) backlogService.delete(item.id);
                  });
                }
          }
        ]
  );

  const classifyChip = el("button", {
    class: `chip chip--${item.classification}${minimal ? " chip--compact" : ""}`,
    type: "button",
    "aria-label": t("card.classificacao", { label: classificationLabel(item.classification, category) })
  }, minimal
    ? [icon(classificationIcon(item.classification, category))]
    : [icon(classificationIcon(item.classification, category)), el("span", {}, [classificationLabel(item.classification, category)])]
  );
  if (!readOnly) {
      classifyChip.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const existing = document.querySelector(".classify-popup");
        if (existing) { existing.remove(); return; }

        const popup = el("div", {
          class: "actions-menu__dropdown classify-popup"
        },
          CATEGORY_CLASSIFICATIONS[category].map((c) => {
            const active = c.value === item.classification;
            const btn = el("button", {
              class: "actions-menu__item",
              type: "button",
              disabled: active || undefined
            }, [
              active ? icon("check") : icon(c.icon),
              el("span", { class: "actions-menu__label" }, [loc(c)])
            ]);
            if (!active) {
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                backlogService.classify(item.id, c.value as TaskClassification);
                popup.remove();
              });
            }
            return btn;
          })
        );

        const chipRect = classifyChip.getBoundingClientRect();
        popup.style.cssText = `position:fixed;top:${chipRect.bottom + 4}px;left:${chipRect.left}px;z-index:300`;

        document.body.appendChild(popup);

        const close = (e: Event) => {
          if (!popup.contains(e.target as Node) && e.target !== classifyChip) {
            popup.remove();
            document.removeEventListener("click", close);
            document.removeEventListener("scroll", close);
          }
        };
        document.addEventListener("click", close);
        document.addEventListener("scroll", close);
      });
  }

  const pointsBtn = minimal ? null : el("button", {
    class: "card__points",
    type: "button",
    "aria-label": t("card.storyPoints", { n: item.storyPoints })
  }, [t("card.pts", { n: item.storyPoints })]);
  if (pointsBtn && !readOnly) {
    pointsBtn.addEventListener("click", () => {
      backlogService.setStoryPoints(item.id, nextFibonacci(item.storyPoints));
    });
  }

  const linkCount = linkService.byBacklogItem(item.id).length;
  const commentCount = commentService.byBacklogItem(item.id).length;
  const imageCount = imageService.byBacklogItem(item.id).length;
  const audioCount = audioService.byBacklogItem(item.id).length;
  const hasContent = item.description !== "" || tasks.length > 0 || linkCount > 0 || commentCount > 0 || imageCount > 0 || audioCount > 0;

  const bodyExpanded = expandedCards.get(item.id) === true;
  const cardBody = el("div", {
    class: `card__body${bodyExpanded ? " card__body--expanded" : ""}`
  }, []);

  if (item.description) {
    cardBody.append(el("p", { class: "card__desc" }, [item.description]));
  }

  cardBody.append(taskList, linkList, imageList, audioList, commentList);

  const cardChildren: (Node | null)[] = [
    menu,
    el("div", { class: "card__top" }, [
      el("div", { class: "card__badges" }, [
        classifyChip,
        !minimal && showPriority ? el("span", { class: `badge badge--${item.priority}`, title: t("card.prioridade", { label: priorityLabel(item.priority) }) }, [icon({
          low: "arrow_downward",
          medium: "remove",
          high: "arrow_upward",
          critical: "priority_high"
        }[item.priority])]) : null
      ]),
      el("div", { class: "card__trailing" }, [
        audioCount > 0 ? el("span", { class: "badge badge--audio", title: t("card.comAudio") }, [icon("graphic_eq")]) : null,
        minimal ? el("span", { class: "card__time", title: fullDateTime(item.createdAt) }, [relativeTime(item.createdAt)]) : null,
        pointsBtn
      ])
    ]),
    el(minimal ? "h3" : "h4", { class: `card__title${minimal ? " card__title--note" : ""}` }, [item.title]),
    progressBar,
    cardBody
  ];

  const showExpand = hasContent && !isArchived;
  const showActions = !readOnly;

  if (showExpand || showActions) {
    const footer = el("div", { class: "card__footer" }, []);

    if (showExpand) {
      const btn = el("button", { class: "card__expand-btn", type: "button" }, [
        icon(bodyExpanded ? "expand_less" : "expand_more"),
        el("span", { class: "card__expand-btn-text" }, [bodyExpanded ? "Recolher" : "Expandir"])
      ]);
      expandBtn = btn;
      btn.addEventListener("click", () => {
        const isExpanded = !expandedCards.get(item.id);
        expandedCards.set(item.id, isExpanded);
        cardBody.classList.toggle("card__body--expanded", isExpanded);
        btn.replaceChildren(
          icon(isExpanded ? "expand_less" : "expand_more"),
        el("span", { class: "card__expand-btn-text" }, [isExpanded ? t("card.recolher") : t("card.expandir")])
        );
      });
      footer.append(btn);
    }

    if (showActions) {
      const actionsFooter = el("div", { class: `card__footer-actions${recording ? " card__footer-actions--recording" : ""}` }, recording
        ? [
            renderRecorderTimer(recording),
            renderRecordingControl(recorder, item.id, (r) => saveStoppedRecording(item.id, r))
          ]
        : [
            cardActionBtn("playlist_add", t("card.adicionarSubtarefa"), locked ? lockedAlert : addSubtask),
            cardActionBtn("chat", t("card.adicionarComentario"), locked ? lockedAlert : addComment),
            cardActionBtn("link", t("card.adicionarLink"), locked ? lockedAlert : addLink),
            cardActionBtn("add_photo_alternate", t("card.adicionarImagem"), locked ? lockedAlert : addImage),
            renderRecordingControl(recorder, item.id, (r) => saveStoppedRecording(item.id, r))
          ]);
      footer.append(actionsFooter);
    }

    cardChildren.push(footer);
  }

  const cardClass = `card${locked ? " card--locked" : ""}${isArchived ? " card--archived" : ""}${minimal ? " card--note" : ""}`;
  const card = el("article", {
    class: cardClass,
    draggable: minimal || readOnly ? "false" : "true",
    "data-id": item.id
  }, cardChildren as Node[]);

  if (!minimal && !readOnly) {
    card.addEventListener("dragstart", (ev) => {
      ev.dataTransfer?.setData("text/plain", item.id);
      card.classList.add("card--dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("card--dragging");
    });
  }

  card.addEventListener("dblclick", (ev) => {
    if ((ev.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    if (!hasContent) return;
    const isExpanded = !expandedCards.get(item.id);
    expandedCards.set(item.id, isExpanded);
    cardBody.classList.toggle("card__body--expanded", isExpanded);
    if (expandBtn) {
      expandBtn.replaceChildren(
        icon(isExpanded ? "expand_less" : "expand_more"),
        el("span", { class: "card__expand-btn-text" }, [isExpanded ? "Recolher" : "Expandir"])
      );
    }
  });

  return card;
}
