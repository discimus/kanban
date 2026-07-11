import { el } from "@ui/components/dom";
import { BacklogItem, PRIORITIES } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { releaseService } from "@contexts/release/application/release.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { openItemDetail } from "@ui/modal/item-detail";

function priorityLabel(p: BacklogItem["priority"]): string {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p;
}

export function backlogCard(item: BacklogItem): HTMLElement {
  const taskCount = taskService.byBacklogItem(item.id).length;
  const release = item.releaseId ? releaseService.get(item.releaseId) : undefined;

  const card = el("article", { class: "card", draggable: "true", "data-id": item.id }, [
    el("div", { class: "card__top" }, [
      el("span", { class: `badge badge--${item.priority}` }, [priorityLabel(item.priority)]),
      el("span", { class: "card__points" }, [`${item.storyPoints} pts`])
    ]),
    el("h4", { class: "card__title" }, [item.title]),
    item.description ? el("p", { class: "card__desc" }, [item.description]) : null,
    el("div", { class: "card__meta" }, [
      release ? el("span", { class: "chip chip--release" }, [`🚀 ${release.name}`]) : null,
      taskCount > 0 ? el("span", { class: "chip" }, [`✓ ${taskCount} tarefas`]) : null
    ]),
    el("div", { class: "card__actions" }, [
      (() => {
        const b = el("button", { class: "btn btn--ghost btn--sm" }, ["Detalhes"]);
        b.addEventListener("click", () => openItemDetail(item));
        return b;
      })(),
      (() => {
        const b = el("button", { class: "btn btn--ghost btn--sm" }, ["Editar"]);
        b.addEventListener("click", () => openBacklogForm(item.productId, item));
        return b;
      })(),
      (() => {
        const b = el("button", { class: "btn btn--danger btn--sm" }, ["Excluir"]);
        b.addEventListener("click", () => {
          if (confirm(`Excluir "${item.title}"?`)) backlogService.delete(item.id);
        });
        return b;
      })()
    ])
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
