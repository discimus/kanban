import { el, icon } from "@ui/components/dom";
import { KANBAN_COLUMNS, KanbanStatus, BacklogItem, ProductCategory } from "@shared/types";

import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { showAlert } from "@ui/components/dialog";
import { showConfetti } from "@ui/components/confetti";
import { backlogCard } from "./card";

export function renderBoard(productId: string): HTMLElement {
  const product = productService.get(productId);
  const locked = product?.status === "completed" || product?.status === "canceled";

  const items = backlogService
    .byProduct(productId)
    .slice()
    .sort((a, b) => priorityRank(b) - priorityRank(a));

  const board = el("div", { class: "board" }, []);

  for (const column of KANBAN_COLUMNS) {
    const columnItems = items.filter((i) => i.status === column.status);
    board.append(renderColumn(column.status, column.label, columnItems, locked, productId, product?.showPriority ?? true, product?.category ?? "development"));
  }

  return board;
}

function priorityRank(item: BacklogItem): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[item.priority];
}

function renderColumn(
  status: KanbanStatus,
  label: string,
  items: BacklogItem[],
  locked: boolean,
  productId: string,
  showPriority: boolean,
  category: ProductCategory
): HTMLElement {
  const body = el("div", { class: "column__body", "data-status": status }, []);

  if (items.length === 0) {
    body.append(el("p", { class: "column__empty" }, ["Sem itens"]));
  } else {
    for (const item of items) body.append(backlogCard(item, locked, showPriority, category));
  }

  if (status === "todo" && !locked) {
    body.append(renderQuickAdd(productId));
  }

  if (!locked) {
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
      if (!id) return;
      try {
        backlogService.move(id, status);
        const card = document.querySelector(`[data-id="${id}"]`);
        if (status === "done" && card) {
          const rect = card.getBoundingClientRect();
          showConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        if (card) {
          card.classList.add("card--just-moved");
          setTimeout(() => card.classList.remove("card--just-moved"), 500);
        }
      } catch (e) {
        showAlert((e as Error).message);
      }
    });
  }

  return el("section", { class: "column" }, [
    el("header", { class: "column__header" }, [
      el("span", { class: "column__title" }, [label]),
      el("span", { class: "column__count" }, [String(items.length)])
    ]),
    body
  ]);
}

function renderQuickAdd(productId: string): HTMLElement {
  const wrapper = el("div", { class: "quick-add" }, []);

  const addBtn = el("button", { class: "btn btn--ghost btn--sm btn--block quick-add__btn" }, [
    icon("add"),
    "Adicionar tarefa"
  ]);

  const showInput = (): void => {
    const input = el("input", {
      class: "quick-add__input",
      type: "text",
      placeholder: "Título da tarefa…"
    }) as HTMLInputElement;

    let done = false;
    const reset = (): void => {
      if (done) return;
      done = true;
      wrapper.replaceChildren(addBtn);
    };

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const title = input.value.trim();
        if (title) {
          try {
            backlogService.create({ productId, title, priority: "medium" });
          } catch (e) {
            showAlert((e as Error).message);
          }
        } else {
          reset();
        }
      } else if (ev.key === "Escape") {
        reset();
      }
    });
    input.addEventListener("blur", () => setTimeout(reset, 150));

    wrapper.replaceChildren(input);
    input.focus();
  };

  addBtn.addEventListener("click", showInput);
  wrapper.append(addBtn);
  return wrapper;
}
