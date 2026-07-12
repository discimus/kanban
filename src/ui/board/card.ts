import { el, icon, clear, actionsMenu } from "@ui/components/dom";
import { BacklogItem, PRIORITIES } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { openBacklogForm } from "@ui/modal/backlog-form";

function priorityLabel(p: BacklogItem["priority"]): string {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

export function backlogCard(item: BacklogItem): HTMLElement {
  const taskList = el("div", { class: "card__tasks" }, []);

  const renderTasks = (): void => {
    clear(taskList);
    const tasks = taskService.byBacklogItem(item.id);
    for (const task of tasks) {
      const done = task.status === "done";

      const checkbox = el("input", { class: "card__task-check", type: "checkbox" }) as HTMLInputElement;
      checkbox.checked = done;
      checkbox.addEventListener("change", () => {
        taskService.changeStatus(task.id, checkbox.checked ? "done" : "todo");
      });

      const del = el("button", { class: "card__task-delete", "aria-label": "Excluir subtarefa" }, [icon("close")]);
      del.addEventListener("click", () => {
        if (confirm(`Excluir subtarefa "${task.title}"?`)) taskService.delete(task.id);
      });

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
    if (taskList.querySelector(".card__task-input")) return;
    const input = el("input", { class: "card__task-input", type: "text", placeholder: "Nova subtarefa…" }) as HTMLInputElement;
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const title = input.value.trim();
        if (title) taskService.create({ backlogItemId: item.id, title });
      } else if (ev.key === "Escape") {
        input.remove();
      }
    });
    input.addEventListener("blur", () => setTimeout(() => input.remove(), 150));
    taskList.append(input);
    input.focus();
  };

  const menu = actionsMenu([
    { label: "Adicionar subtarefa", icon: "playlist_add", action: addSubtask },
    { label: "Editar", icon: "edit", action: () => openBacklogForm(item.productId, item) },
    {
      label: "Excluir",
      icon: "delete",
      danger: true,
      action: () => {
        if (confirm(`Excluir "${item.title}"?`)) backlogService.delete(item.id);
      }
    }
  ]);

  const card = el("article", { class: "card", draggable: "true", "data-id": item.id }, [
    menu,
    el("div", { class: "card__top" }, [
      el("span", { class: `badge badge--${item.priority}` }, [priorityLabel(item.priority)]),
      el("span", { class: "card__points" }, [`${item.storyPoints} pts`])
    ]),
    el("h4", { class: "card__title" }, [item.title]),
    item.description ? el("p", { class: "card__desc" }, [item.description]) : null,
    taskList
  ]);

  card.addEventListener("dragstart", (ev) => {
    ev.dataTransfer?.setData("text/plain", item.id);
    card.classList.add("card--dragging");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("card--dragging");
  });

  return card;
}
