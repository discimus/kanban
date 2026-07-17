import { el, icon } from "@ui/components/dom";
import { KANBAN_COLUMNS, KanbanStatus, BacklogItem, ProductCategory, TaskClassification, CATEGORY_CLASSIFICATIONS } from "@shared/types";

import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { showAlert } from "@ui/components/dialog";
import { showConfetti } from "@ui/components/confetti";
import { backlogCard } from "./card";
import { openShortcutsHelp } from "@ui/components/help-menu";

let kbRegistered = false;
let classificationFilter: Set<TaskClassification> | null = null;

function onGlobalKeydown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
  if (document.querySelector(".modal-overlay")) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === "?") {
    e.preventDefault();
    openShortcutsHelp();
    return;
  }

  if (e.key.toLowerCase() !== "n") return;
  e.preventDefault();

  const board = document.querySelector(".board");
  if (!board) return;
  const btn = board.querySelector<HTMLButtonElement>(".quick-add__btn");
  const input = board.querySelector<HTMLInputElement>(".quick-add__input");
  if (input) {
    input.focus();
  } else if (btn) {
    btn.click();
  }
}

export function renderBoard(productId: string, showArchived = false, onFilterChange?: () => void): HTMLElement {
  const product = productService.get(productId);
  const locked = product?.status === "completed" || product?.status === "canceled" || !!product?.archivedAt;

  const allItems = backlogService
    .byProduct(productId)
    .filter((i) => showArchived || !i.archivedAt);

  const category = product?.category ?? "development";

  let displayItems = allItems;

  if (classificationFilter !== null && classificationFilter.size > 0) {
    displayItems = allItems.filter(i => classificationFilter!.has(i.classification));
  }

  displayItems = displayItems.slice().sort((a, b) => priorityRank(b) - priorityRank(a));

  const wrapper = el("div", { class: "board-wrapper" }, []);
  const uniqueClassifications = new Set(allItems.map(i => i.classification));
  const activeFilter = classificationFilter !== null && classificationFilter.size > 0;
  if (uniqueClassifications.size > 1 || activeFilter) {
    wrapper.append(renderClassificationFilter(allItems, category, onFilterChange));
  }

  const board = el("div", { class: "board" }, []);

  for (const column of KANBAN_COLUMNS) {
    if (column.status === "review" && product?.showReview === false) continue;
    const columnItems = displayItems.filter((i) => i.status === column.status);
    board.append(renderColumn(column.status, column.label, column.icon, columnItems, locked, productId, product?.showPriority ?? true, category));
  }

  wrapper.append(board);

  if (!kbRegistered) {
    document.addEventListener("keydown", onGlobalKeydown);
    kbRegistered = true;
  }

  return wrapper;
}

function priorityRank(item: BacklogItem): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[item.priority];
}

function renderClassificationFilter(
  allItems: BacklogItem[],
  category: ProductCategory,
  onFilterChange?: () => void
): HTMLElement {
  const classifications = CATEGORY_CLASSIFICATIONS[category];
  const bar = el("div", { class: "filter-bar board__filters" }, []);

  const allChip = el("button", {
    class: `chip chip--filter${classificationFilter === null ? " chip--selected" : ""}`,
    type: "button",
    title: "Mostrar todas as classificações"
  }, ["Todas"]);
  allChip.addEventListener("click", () => {
    if (classificationFilter !== null) {
      classificationFilter = null;
      onFilterChange?.();
    }
  });
  bar.append(allChip);

  const scrollRow = el("div", { class: "filter-bar--scroll" }, []);

  for (const cl of classifications) {
    const count = allItems.filter(i => i.classification === cl.value).length;
    const selected = classificationFilter !== null && classificationFilter.has(cl.value);

    const chip = el("button", {
      class: selected
        ? `chip chip--${cl.value} chip--selected`
        : `chip chip--filter`,
      type: "button",
      title: `${cl.label} (${count})`
    }, [
      icon(cl.icon),
      el("span", { class: "chip__label" }, [cl.label]),
      el("span", { class: "chip__count" }, [`(${count})`])
    ]);

    chip.addEventListener("click", () => {
      if (classificationFilter === null) {
        classificationFilter = new Set([cl.value]);
      } else if (classificationFilter.has(cl.value)) {
        classificationFilter.delete(cl.value);
        if (classificationFilter.size === 0) classificationFilter = null;
      } else {
        classificationFilter.add(cl.value);
      }
      onFilterChange?.();
    });
    scrollRow.append(chip);
  }

  bar.append(scrollRow);
  return bar;
}

function renderColumn(
  status: KanbanStatus,
  label: string,
  labelIcon: string,
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
      el("span", { class: "column__title" }, [icon(labelIcon), label]),
      el("span", { class: "column__count" }, [String(items.length)])
    ]),
    body
  ]);
}

function renderQuickAdd(productId: string): HTMLElement {
  const wrapper = el("div", { class: "quick-add" }, []);

  const addBtn = el("button", { class: "btn btn--ghost btn--sm btn--block quick-add__btn", title: "Adicionar tarefa (N)" }, [
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
