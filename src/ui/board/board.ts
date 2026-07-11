import { el } from "@ui/components/dom";
import { KANBAN_COLUMNS, KanbanStatus, BacklogItem } from "@shared/types";
import { backlogService } from "@contexts/product/application/backlog.service";
import { backlogCard } from "./card";

export function renderBoard(productId: string): HTMLElement {
  const items = backlogService
    .byProduct(productId)
    .slice()
    .sort((a, b) => priorityRank(b) - priorityRank(a));

  const board = el("div", { class: "board" }, []);

  for (const column of KANBAN_COLUMNS) {
    const columnItems = items.filter((i) => i.status === column.status);
    board.append(renderColumn(column.status, column.label, columnItems));
  }

  return board;
}

function priorityRank(item: BacklogItem): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[item.priority];
}

function renderColumn(status: KanbanStatus, label: string, items: BacklogItem[]): HTMLElement {
  const body = el("div", { class: "column__body", "data-status": status }, []);

  if (items.length === 0) {
    body.append(el("p", { class: "column__empty" }, ["Sem itens"]));
  } else {
    for (const item of items) body.append(backlogCard(item));
  }

  body.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    body.classList.add("column__body--over");
  });
  body.addEventListener("dragleave", () => {
    body.classList.remove("column__body--over");
  });
  body.addEventListener("drop", (ev) => {
    ev.preventDefault();
    body.classList.remove("column__body--over");
    const id = ev.dataTransfer?.getData("text/plain");
    if (id) backlogService.move(id, status);
  });

  return el("section", { class: "column" }, [
    el("header", { class: "column__header" }, [
      el("span", { class: "column__title" }, [label]),
      el("span", { class: "column__count" }, [String(items.length)])
    ]),
    body
  ]);
}
