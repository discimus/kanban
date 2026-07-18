import { el, icon, clear, actionsMenu, MenuItem } from "@ui/components/dom";
import { BacklogItem, PRIORITIES, KANBAN_COLUMNS, CATEGORY_CLASSIFICATIONS, TaskClassification, ProductCategory } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { linkService } from "@contexts/link/application/link.service";
import { commentService } from "@contexts/comment/application/comment.service";
import { imageService } from "@contexts/image/application/image.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { showAlert, showConfirm } from "@ui/components/dialog";
import { timeAgo, formatDate } from "@shared/utils";
import { openModal, closeModal } from "../modal";
import { field, select, errorText } from "@ui/components/forms";

function priorityLabel(p: BacklogItem["priority"]): string {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

function classificationLabel(c: TaskClassification, category: ProductCategory): string {
  return CATEGORY_CLASSIFICATIONS[category].find((x) => x.value === c)?.label ?? c;
}

function classificationIcon(c: TaskClassification, category: ProductCategory): string {
  return CATEGORY_CLASSIFICATIONS[category].find((x) => x.value === c)?.icon ?? "help";
}

function openMoveToProjectDialog(item: BacklogItem): void {
  const projects = productService.list().filter(p => p.id !== item.productId);
  if (projects.length === 0) {
    showAlert("Não há outros projetos disponíveis.");
    return;
  }

  const sel = select(
    projects.map(p => ({ value: p.id, label: p.name })),
    ""
  );

  const error = errorText();
  const body = el("div", { class: "form" }, [
    el("p", { style: "margin-bottom: 12px; color: var(--text-secondary);" }, [`Mover "${item.title}" para:`]),
    field("Projeto de destino", sel),
    error
  ]);

  const cancelBtn = el("button", { class: "btn", type: "button" }, ["Cancelar"]);
  const moveBtn = el("button", { class: "btn btn--primary", type: "button" }, ["Mover"]);

  const actions = el("div", { class: "form__actions" }, [cancelBtn, moveBtn]);
  body.append(actions);

  cancelBtn.addEventListener("click", closeModal);
  moveBtn.addEventListener("click", () => {
    if (!sel.value) {
      error.textContent = "Selecione um projeto de destino.";
      return;
    }
    try {
      backlogService.changeProduct(item.id, sel.value);
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  });

  openModal({ title: "Mover card para outro projeto", body });
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
  if (seg < 60) return "agora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const dias = Math.floor(hr / 24);
  if (dias < 30) return `há ${dias}d`;
  return formatDate(iso);
}

function fullDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const expandedCards = new Map<string, boolean>();

function openImageModal(dataUrl: string, filename: string): void {
  const img = el("img", {
    class: "modal__image-full",
    src: dataUrl,
    alt: filename
  }) as HTMLImageElement;

  openModal({
    body: img,
    autoFocus: false,
    noHeader: true
  });

  const dialog = document.querySelector(".modal");
  if (dialog) dialog.classList.add("modal--image");
}

export function backlogCard(item: BacklogItem, locked = false, showPriority = true, category: ProductCategory = "development", minimal = false): HTMLElement {
  const isArchived = !!item.archivedAt;
  const readOnly = locked || isArchived;
  const taskList = el("div", { class: "card__tasks" }, []);

  const renderTasks = (): void => {
    clear(taskList);
    const tasks = taskService.byBacklogItem(item.id);
    for (const task of tasks) {
      const done = task.status === "done";

      const checkbox = el("input", { class: "card__task-check", type: "checkbox" }) as HTMLInputElement;
      checkbox.checked = done;
      checkbox.disabled = readOnly;
      if (!readOnly) {
        checkbox.addEventListener("change", () => {
          taskService.changeStatus(task.id, checkbox.checked ? "done" : "todo");
        });
      }

      const del = el("button", { class: "card__task-delete", "aria-label": "Excluir subtarefa" }, [icon("close")]);
      del.disabled = readOnly;
      if (!readOnly) {
        del.addEventListener("click", () => {
          showConfirm('Excluir subtarefa "{{text}}"?', task.title).then((ok) => {
            if (ok) taskService.delete(task.id);
          });
        });
      }

      taskList.append(
        el("div", { class: `card__task${done ? " card__task--done" : ""}` }, [
          checkbox,
          el("span", { class: "card__task-text" }, [task.title]),
          del
        ])
      );
    }
  };
  renderTasks();

  const tasks = taskService.byBacklogItem(item.id);
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
        "aria-label": `Abrir ${link.url}`
      }, [icon("link")]);

      if (link.visitedAt) {
        linkBtn.classList.add("card__link-btn--visited");
        linkBtn.title = timeAgo(link.visitedAt);
      }

      linkBtn.addEventListener("click", () => {
        linkService.markAsVisited(link.id);
      });

      const del = el("button", { class: "card__task-delete", "aria-label": "Excluir link" }, [icon("close")]);
      del.disabled = readOnly;
      if (!readOnly) {
        del.addEventListener("click", () => {
          showConfirm('Excluir link "{{text}}"?', displayUrl).then((ok) => {
            if (ok) linkService.delete(link.id);
          });
        });
      }

      linkList.append(
        el("div", { class: "card__task" }, [
          linkBtn,
          el("span", { class: "card__task-text" }, [displayUrl]),
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
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, ["Recolher"]));
    }

    const urlInput = el("input", { class: "card__task-input", type: "text", placeholder: "URL do link…" }) as HTMLInputElement;

    const save = el("button", { class: "card__subtask-save", "aria-label": "Salvar link", type: "button" }, [
      icon("check")
    ]);

    const row = el("div", { class: "card__subtask-add" }, [urlInput, save]);

    let done = false;
    const commit = (): void => {
      if (done) return;
      const url = urlInput.value.trim();
      if (url) {
        done = true;
        linkService.create({ backlogItemId: item.id, url });
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
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, ["Recolher"]));
    }

    const input = el("input", { class: "card__task-input", type: "text", placeholder: "Nova subtarefa…" }) as HTMLInputElement;

    const save = el("button", { class: "card__subtask-save", "aria-label": "Salvar subtarefa", type: "button" }, [
      icon("check")
    ]);

    const row = el("div", { class: "card__subtask-add" }, [input, save]);

    let done = false;
    const commit = (): void => {
      if (done) return;
      const title = input.value.trim();
      if (title) {
        done = true;
        taskService.create({ backlogItemId: item.id, title });
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

      const del = el("button", { class: "card__task-delete card__image-delete", "aria-label": "Excluir imagem" }, [icon("close")]);
      del.disabled = readOnly;
      if (!readOnly) {
        del.addEventListener("click", () => {
          showConfirm('Excluir imagem "{{text}}"?', img.filename).then((ok) => {
            if (ok) imageService.delete(img.id);
          });
        });
      }

      const wrap = el("div", { class: "card__image-wrap" }, [thumb, del]);
      thumb.addEventListener("click", () => openImageModal(img.dataUrl, img.filename));
      imageList.append(wrap);
    }
  };
  renderImages();

  const renderComments = (): void => {
    clear(commentList);
    const comments = commentService.byBacklogItem(item.id);
    for (const c of comments) {
      const delBtn = el("button", { class: "card__task-delete", "aria-label": "Excluir comentário" }, [icon("close")]);
      delBtn.disabled = readOnly;
      if (!readOnly) {
        delBtn.addEventListener("click", () => {
          showConfirm('Excluir comentário "{{text}}"?', c.text).then((ok) => {
            if (ok) commentService.delete(c.id);
          });
        });
      }

      const timeSpan = el("span", {
        class: "card__comment-time",
        title: c.updatedAt
          ? `Criado ${fullDateTime(c.createdAt)} · Editado ${fullDateTime(c.updatedAt)}`
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

  const addComment = (): void => {
    if (commentList.querySelector(".card__subtask-add")) return;
    if (!cardBody.classList.contains("card__body--expanded")) {
      expandedCards.set(item.id, true);
      cardBody.classList.add("card__body--expanded");
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, ["Recolher"]));
    }

    const input = el("input", { class: "card__task-input", type: "text", placeholder: "Adicionar comentário…" }) as HTMLInputElement;
    const save = el("button", { class: "card__subtask-save", "aria-label": "Salvar comentário", type: "button" }, [
      icon("check")
    ]);

    const row = el("div", { class: "card__subtask-add" }, [input, save]);

    let done = false;
    const commit = (): void => {
      if (done) return;
      const text = input.value.trim();
      if (text) {
        done = true;
        commentService.create({ backlogItemId: item.id, text });
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
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", { class: "card__expand-btn-text" }, ["Recolher"]));
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
                imageService.create({
                  backlogItemId: item.id,
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
          expandCard();
          imageService.create({
            backlogItemId: item.id,
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

  const lockedAlert = (): void => {
    showAlert(
      'Este projeto está concluído, cancelado ou arquivado. Altere o status pelo menu "⋮" → "Editar" do projeto para modificar os itens.'
    );
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
            label: "Restaurar",
            icon: "restore",
            action: () => backlogService.restore(item.id)
          },
          {
            label: "Excluir",
            icon: "delete",
            danger: true,
            action: () => {
              showConfirm('Excluir "{{text}}"?', item.title).then((ok) => {
                if (ok) backlogService.delete(item.id);
              });
            }
          }
        ]
      : [
          {
            label: "Editar",
            icon: "edit",
            action: locked ? lockedAlert : () => openBacklogForm(item.productId, item)
          },
          { label: "Adicionar...", icon: "add", submenu: [
            { label: "Subtarefa", icon: "playlist_add", action: locked ? lockedAlert : addSubtask },
            { label: "Comentário", icon: "chat", action: locked ? lockedAlert : addComment },
            { label: "Link", icon: "link", action: locked ? lockedAlert : addLink },
            { label: "Imagem", icon: "add_photo_alternate", action: locked ? lockedAlert : addImage }
          ]},
          ...(isNotes ? [] : [{ label: "Mover para", icon: "swap_horiz", submenu: columnSubmenu }]),
          { label: "Mover para projeto...", icon: "output", action: locked ? lockedAlert : () => openMoveToProjectDialog(item) },
          { label: "Arquivar", icon: "archive", action: () => backlogService.archive(item.id) },
          {
            label: "Excluir",
            icon: "delete",
            danger: true,
            action: locked
              ? lockedAlert
              : () => {
                  showConfirm('Excluir "{{text}}"?', item.title).then((ok) => {
                    if (ok) backlogService.delete(item.id);
                  });
                }
          }
        ]
  );

  const classifyChip = el("button", {
    class: `chip chip--${item.classification}${minimal ? " chip--compact" : ""}`,
    type: "button",
    "aria-label": `Classificação: ${classificationLabel(item.classification, category)}`
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
              el("span", { class: "actions-menu__label" }, [c.label])
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
    "aria-label": `${item.storyPoints} story points`
  }, [`${item.storyPoints} pts`]);
  if (pointsBtn && !readOnly) {
    pointsBtn.addEventListener("click", () => {
      backlogService.setStoryPoints(item.id, nextFibonacci(item.storyPoints));
    });
  }

  const linkCount = linkService.byBacklogItem(item.id).length;
  const commentCount = commentService.byBacklogItem(item.id).length;
  const imageCount = imageService.byBacklogItem(item.id).length;
  const hasContent = item.description !== "" || tasks.length > 0 || linkCount > 0 || commentCount > 0 || imageCount > 0;

  const bodyExpanded = expandedCards.get(item.id) === true;
  const cardBody = el("div", {
    class: `card__body${bodyExpanded ? " card__body--expanded" : ""}`
  }, []);

  if (item.description) {
    cardBody.append(el("p", { class: "card__desc" }, [item.description]));
  }
  cardBody.append(taskList, linkList, imageList, commentList);

  const cardChildren: (Node | null)[] = [
    menu,
    el("div", { class: "card__top" }, [
      el("div", { class: "card__badges" }, [
        classifyChip,
        !minimal && showPriority ? el("span", { class: `badge badge--${item.priority}`, title: `Prioridade: ${priorityLabel(item.priority)}` }, [icon({
          low: "arrow_downward",
          medium: "remove",
          high: "arrow_upward",
          critical: "priority_high"
        }[item.priority])]) : null
      ]),
      minimal ? el("span", { class: "card__time", title: fullDateTime(item.createdAt) }, [relativeTime(item.createdAt)]) : null,
      pointsBtn
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
          el("span", { class: "card__expand-btn-text" }, [isExpanded ? "Recolher" : "Expandir"])
        );
      });
      footer.append(btn);
    }

    if (showActions) {
      const actionsFooter = el("div", { class: "card__footer-actions" }, [
        cardActionBtn("playlist_add", "Adicionar subtarefa", locked ? lockedAlert : addSubtask),
        cardActionBtn("chat", "Adicionar comentário", locked ? lockedAlert : addComment),
        cardActionBtn("link", "Adicionar link", locked ? lockedAlert : addLink),
        cardActionBtn("add_photo_alternate", "Adicionar imagem", locked ? lockedAlert : addImage)
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
