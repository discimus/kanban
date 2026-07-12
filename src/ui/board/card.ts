import { el, icon, clear, actionsMenu, MenuItem } from "@ui/components/dom";
import { BacklogItem, PRIORITIES, KANBAN_COLUMNS, CATEGORY_CLASSIFICATIONS, TaskClassification, ProductCategory } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { linkService } from "@contexts/link/application/link.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { showAlert, showConfirm } from "@ui/components/dialog";

function priorityLabel(p: BacklogItem["priority"]): string {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

function classificationLabel(c: TaskClassification, category: ProductCategory): string {
  return CATEGORY_CLASSIFICATIONS[category].find((x) => x.value === c)?.label ?? c;
}

function classificationIcon(c: TaskClassification, category: ProductCategory): string {
  return CATEGORY_CLASSIFICATIONS[category].find((x) => x.value === c)?.icon ?? "help";
}

function nextClassification(current: TaskClassification, category: ProductCategory): TaskClassification {
  const list = CATEGORY_CLASSIFICATIONS[category];
  const idx = list.findIndex((c) => c.value === current);
  return list[(idx + 1) % list.length].value;
}

const FIBONACCI = [1, 2, 3, 5, 8];

function nextFibonacci(current: number): number {
  const idx = FIBONACCI.indexOf(current);
  if (idx === -1 || idx === FIBONACCI.length - 1) return FIBONACCI[0];
  return FIBONACCI[idx + 1];
}

const expandedCards = new Map<string, boolean>();

export function backlogCard(item: BacklogItem, locked = false, showPriority = true, category: ProductCategory = "development"): HTMLElement {
  const taskList = el("div", { class: "card__tasks" }, []);

  const renderTasks = (): void => {
    clear(taskList);
    const tasks = taskService.byBacklogItem(item.id);
    for (const task of tasks) {
      const done = task.status === "done";

      const checkbox = el("input", { class: "card__task-check", type: "checkbox" }) as HTMLInputElement;
      checkbox.checked = done;
      checkbox.disabled = locked;
      if (!locked) {
        checkbox.addEventListener("change", () => {
          taskService.changeStatus(task.id, checkbox.checked ? "done" : "todo");
        });
      }

      const del = el("button", { class: "card__task-delete", "aria-label": "Excluir subtarefa" }, [icon("close")]);
      del.disabled = locked;
      if (!locked) {
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

      const del = el("button", { class: "card__task-delete", "aria-label": "Excluir link" }, [icon("close")]);
      del.disabled = locked;
      if (!locked) {
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
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", {}, ["Recolher"]));
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
  };

  const addSubtask = (): void => {
    if (taskList.querySelector(".card__subtask-add")) return;
    if (!cardBody.classList.contains("card__body--expanded")) {
      expandedCards.set(item.id, true);
      cardBody.classList.add("card__body--expanded");
      if (expandBtn) expandBtn.replaceChildren(icon("expand_less"), el("span", {}, ["Recolher"]));
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

  const lockedAlert = (): void => {
    showAlert(
      'Este projeto está concluído ou cancelado. Altere o status pelo menu "⋮" → "Editar" do projeto para modificar os itens.'
    );
  };

  const currentIndex = KANBAN_COLUMNS.findIndex((c) => c.status === item.status);
  const prevColumn = currentIndex > 0 ? KANBAN_COLUMNS[currentIndex - 1] : null;
  const nextColumn = currentIndex < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[currentIndex + 1] : null;

  const moveTo = (status: (typeof KANBAN_COLUMNS)[number]["status"]): void => {
    try {
      backlogService.move(item.id, status);
    } catch (e) {
      showAlert((e as Error).message);
    }
  };

  const moveItems: MenuItem[] = [];
  if (nextColumn) {
    moveItems.push({
      label: `Avançar para "${nextColumn.label}"`,
      icon: "arrow_forward",
      action: locked ? lockedAlert : () => moveTo(nextColumn.status)
    });
  }
  if (prevColumn) {
    moveItems.push({
      label: `Voltar para "${prevColumn.label}"`,
      icon: "arrow_back",
      action: locked ? lockedAlert : () => moveTo(prevColumn.status)
    });
  }

  const menu = actionsMenu([
    { label: "Adicionar subtarefa", icon: "playlist_add", action: locked ? lockedAlert : addSubtask },
    { label: "Adicionar link", icon: "link", action: locked ? lockedAlert : addLink },
    ...moveItems,
    {
      label: "Editar",
      icon: "edit",
      action: locked ? lockedAlert : () => openBacklogForm(item.productId, item)
    },
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
  ]);

  const classifyChip = el("button", {
    class: `chip chip--${item.classification}`,
    type: "button",
    "aria-label": `Classificação: ${classificationLabel(item.classification, category)}`
  }, [
    icon(classificationIcon(item.classification, category)),
    el("span", {}, [classificationLabel(item.classification, category)])
  ]);
  if (!locked) {
    classifyChip.addEventListener("click", () => {
      backlogService.classify(item.id, nextClassification(item.classification, category));
    });
  }

  const pointsBtn = el("button", {
    class: "card__points",
    type: "button",
    "aria-label": `${item.storyPoints} story points`
  }, [`${item.storyPoints} pts`]);
  if (!locked) {
    pointsBtn.addEventListener("click", () => {
      backlogService.setStoryPoints(item.id, nextFibonacci(item.storyPoints));
    });
  }

  const linkCount = linkService.byBacklogItem(item.id).length;
  const hasContent = item.description !== "" || tasks.length > 0 || linkCount > 0;

  const bodyExpanded = expandedCards.get(item.id) === true;
  const cardBody = el("div", {
    class: `card__body${bodyExpanded ? " card__body--expanded" : ""}`
  }, []);

  if (item.description) {
    cardBody.append(el("p", { class: "card__desc" }, [item.description]));
  }
  cardBody.append(taskList, linkList);

  const cardChildren: (Node | null)[] = [
    menu,
    el("div", { class: "card__top" }, [
      el("div", { class: "card__badges" }, [
        classifyChip,
        showPriority ? el("span", { class: `badge badge--${item.priority}` }, [priorityLabel(item.priority)]) : null
      ]),
      pointsBtn
    ]),
    el("h4", { class: "card__title" }, [item.title]),
    progressBar,
    cardBody
  ];

  if (hasContent) {
    const btn = el("button", { class: "card__expand-btn", type: "button" }, [
      icon(bodyExpanded ? "expand_less" : "expand_more"),
      el("span", {}, [bodyExpanded ? "Recolher" : "Expandir"])
    ]);
    expandBtn = btn;
    btn.addEventListener("click", () => {
      const isExpanded = !expandedCards.get(item.id);
      expandedCards.set(item.id, isExpanded);
      cardBody.classList.toggle("card__body--expanded", isExpanded);
      btn.replaceChildren(
        icon(isExpanded ? "expand_less" : "expand_more"),
        el("span", {}, [isExpanded ? "Recolher" : "Expandir"])
      );
    });
    cardChildren.push(btn);
  }

  const card = el("article", { class: `card${locked ? " card--locked" : ""}`, draggable: locked ? "false" : "true", "data-id": item.id }, cardChildren as Node[]);

  if (!locked) {
    card.addEventListener("dragstart", (ev) => {
      ev.dataTransfer?.setData("text/plain", item.id);
      card.classList.add("card--dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("card--dragging");
    });
  }

  return card;
}
