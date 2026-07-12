import { el, icon, clear, actionsMenu, MenuItem } from "@ui/components/dom";
import { BacklogItem, PRIORITIES, KANBAN_COLUMNS, TASK_CLASSIFICATIONS, TaskClassification } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { showAlert, showConfirm } from "@ui/components/dialog";

function priorityLabel(p: BacklogItem["priority"]): string {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

function classificationLabel(c: TaskClassification): string {
  return TASK_CLASSIFICATIONS.find((x) => x.value === c)?.label ?? c;
}

function classificationIcon(c: TaskClassification): string {
  return TASK_CLASSIFICATIONS.find((x) => x.value === c)?.icon ?? "help";
}

function nextClassification(current: TaskClassification): TaskClassification {
  const idx = TASK_CLASSIFICATIONS.findIndex((c) => c.value === current);
  return TASK_CLASSIFICATIONS[(idx + 1) % TASK_CLASSIFICATIONS.length].value;
}

const FIBONACCI = [1, 2, 3, 5, 8];

function nextFibonacci(current: number): number {
  const idx = FIBONACCI.indexOf(current);
  if (idx === -1 || idx === FIBONACCI.length - 1) return FIBONACCI[0];
  return FIBONACCI[idx + 1];
}

export function backlogCard(item: BacklogItem, locked = false): HTMLElement {
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
          showConfirm(`Excluir subtarefa "${task.title}"?`).then((ok) => {
            if (ok) taskService.delete(task.id);
          });
        });
      }

      taskList.append(
        el("label", { class: `card__task${done ? " card__task--done" : ""}` }, [
          checkbox,
          el("span", { class: "card__task-text" }, [task.title]),
          del
        ])
      );
    }
  };
  renderTasks();

  const addSubtask = (): void => {
    if (taskList.querySelector(".card__subtask-add")) return;

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
            showConfirm(`Excluir "${item.title}"?`).then((ok) => {
              if (ok) backlogService.delete(item.id);
            });
          }
    }
  ]);

  const classifyChip = el("button", {
    class: `chip chip--${item.classification}`,
    type: "button",
    "aria-label": `Classificação: ${classificationLabel(item.classification)}`
  }, [
    icon(classificationIcon(item.classification)),
    el("span", {}, [classificationLabel(item.classification)])
  ]);
  if (!locked) {
    classifyChip.addEventListener("click", () => {
      backlogService.classify(item.id, nextClassification(item.classification));
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

  const card = el("article", { class: `card${locked ? " card--locked" : ""}`, draggable: locked ? "false" : "true", "data-id": item.id }, [
    menu,
    el("div", { class: "card__top" }, [
      el("div", { class: "card__badges" }, [
        classifyChip,
        el("span", { class: `badge badge--${item.priority}` }, [priorityLabel(item.priority)])
      ]),
      pointsBtn
    ]),
    el("h4", { class: "card__title" }, [item.title]),
    item.description ? el("p", { class: "card__desc" }, [item.description]) : null,
    taskList
  ]);

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
