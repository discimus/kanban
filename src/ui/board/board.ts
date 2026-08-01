import { el, icon } from "@ui/components/dom";
import { KANBAN_COLUMNS, KanbanStatus, BacklogItem, ProductCategory, TaskClassification, CATEGORY_CLASSIFICATIONS } from "@shared/types";

import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { showAlert } from "@ui/components/dialog";
import { showConfetti } from "@ui/components/confetti";
import { backlogCard } from "./card";
import { openShortcutsHelp } from "@ui/components/help-menu";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { renderStickyRow, renderStickyToggle } from "./sticky-row";
import { t } from "@shared/i18n";
import "./board-mobile.css";

let kbRegistered = false;
let classificationFilter: Set<TaskClassification> | null = null;

function onGlobalKeydown(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
  if (document.querySelector(".modal-overlay")) return;
  // Shift+N → full modal form (not inline quick-add)
  if (e.shiftKey && e.key.toLowerCase() === "n") {
    e.preventDefault();
    const productId = document.querySelector<HTMLElement>(".content")?.dataset.productId;
    if (productId) openBacklogForm(productId);
    return;
  }

  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === "?") {
    e.preventDefault();
    openShortcutsHelp();
    return;
  }

  if (e.key.toLowerCase() !== "n") return;
  e.preventDefault();

  const board = document.querySelector<HTMLElement>(".board, .board--notes");
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
  const filterBar = uniqueClassifications.size > 1 || activeFilter
    ? renderClassificationFilter(allItems, category, onFilterChange)
    : null;

  const board = el("div", { class: "board" }, []);

  const stickyBlock = renderStickyRow(productId, locked);
  const stickyToggle = stickyBlock ? renderStickyToggle() : null;

  if (filterBar || stickyToggle) {
    wrapper.append(el("div", { class: "board-toolbar" }, [filterBar, stickyToggle]));
  }
  if (stickyBlock) wrapper.append(stickyBlock);

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

  setupBottomSentinel(board);

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
    title: t("board.mostrarTodas")
  }, [t("board.todas")]);
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
    body.append(el("p", { class: "column__empty" }, [t("board.semItens")]));
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

  const addBtn = el("button", { class: "btn btn--ghost btn--sm btn--block quick-add__btn", title: t("board.adicionarTarefaTitle") }, [
    icon("add"),
    t("board.adicionarTarefa")
  ]);

  const showInput = (): void => {
    const input = el("input", {
      class: "quick-add__input",
      type: "text",
      placeholder: t("board.tituloTarefa")
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

function renderNotesQuickAdd(productId: string): HTMLElement {
  const wrapper = el("div", { class: "quick-add quick-add--notes" }, []);

  const addBtn = el("button", { class: "btn btn--ghost btn--sm btn--block quick-add__btn", title: t("board.adicionarNotaTitle") }, [
    icon("add"),
    t("board.adicionarNota")
  ]);

  const showInput = (): void => {
    const input = el("input", {
      class: "quick-add__input",
      type: "text",
      placeholder: t("board.tituloNota")
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
            backlogService.create({ productId, title, priority: "medium", classification: "note" });
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

export function renderNotesBoard(productId: string, showArchived = false, onFilterChange?: () => void): HTMLElement {
  const product = productService.get(productId);
  const locked = product?.status === "completed" || product?.status === "canceled" || !!product?.archivedAt;
  const category = product?.category ?? "notes";

  const allItems = backlogService
    .byProduct(productId)
    .filter((i) => showArchived || !i.archivedAt);

  let displayItems = allItems;

  if (classificationFilter !== null && classificationFilter.size > 0) {
    displayItems = allItems.filter(i => classificationFilter!.has(i.classification));
  }

  const wrapper = el("div", { class: "board-wrapper" }, []);
  const uniqueClassifications = new Set(allItems.map(i => i.classification));
  const notesClasses = CATEGORY_CLASSIFICATIONS.notes;
  const noteClassValues = new Set(notesClasses.map(c => c.value));
  const hasNoteClasses = [...uniqueClassifications].some(c => noteClassValues.has(c));
  const activeFilter = classificationFilter !== null && classificationFilter.size > 0;

  if (hasNoteClasses || activeFilter) {
    wrapper.append(renderClassificationFilter(allItems, "notes", onFilterChange));
  }

  const board = el("div", { class: "board board--notes" }, []);

  if (!locked) {
    board.append(renderNotesQuickAdd(productId));
  }

  for (const cl of notesClasses) {
    const groupItems = displayItems.filter(i => i.classification === cl.value);
    if (groupItems.length === 0) continue;

    const group = el("div", { class: "notes-group" }, [
      el("header", { class: "notes-group__header" }, [
        icon(cl.icon),
        cl.label,
        el("span", { class: "notes-group__count" }, [String(groupItems.length)])
      ]),
      el("div", { class: "notes-group__cards" },
        groupItems.map(item => backlogCard(item, locked, false, category, true))
      )
    ]);
    board.append(group);
  }

  if (board.children.length <= 1 && !locked) {
    board.append(el("p", { class: "notes-empty" }, [t("board.nenhumaNota")]));
  }

  wrapper.append(board);

  if (!kbRegistered) {
    document.addEventListener("keydown", onGlobalKeydown);
    kbRegistered = true;
  }

  setupNotesBottomHide(board);

  return wrapper;
}

/**
 * Passive scroll listener for the notes board (flex layout).
 * A more reliable alternative to the IntersectionObserver + sentinel
 * approach used in the grid-based task board, since the 1px sentinel
 * with grid-column: 1 / -1 is not applicable in a flex context.
 */
function setupNotesBottomHide(board: HTMLElement): void {
  if (!window.matchMedia("(max-width: 720px)").matches) return;

  const getFabs = (): HTMLElement[] =>
    [".theme-toggle", ".locale-btn", ".help-btn", ".drawer-btn"]
      .flatMap(s => Array.from(document.querySelectorAll<HTMLElement>(s)));

  const update = (): void => {
    const { scrollTop, scrollHeight, clientHeight } = board;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 1;
    getFabs().forEach(fab => fab.classList.toggle("board-item--hidden", atBottom));
  };

  board.addEventListener("scroll", update, { passive: true });
  update();
}

/**
 * Appends an invisible sentinel element at the end of the board grid.
 * Uses IntersectionObserver (viewport root, zero polling) to detect when
 * the user reaches the bottom of the scrollable area.
 *
 * - Board not scrollable                          → do nothing.
 * - Board scrollable, sentinel hidden (scroll 0)  → watch for intersection.
 *   · Sentinel enters viewport → user at bottom   → hide FABs.
 *   · Sentinel leaves viewport → user scrolled up → show FABs.
 */

/** Retains the active observer so it can be disconnected on re-render. */
let activeBottomObserver: IntersectionObserver | null = null;

function setupBottomSentinel(board: HTMLElement): void {
  if (!window.matchMedia("(max-width: 720px)").matches) return;

  // Disconnect the observer from the previous render cycle before creating a new one.
  activeBottomObserver?.disconnect();
  activeBottomObserver = null;

  const sentinel = el("div", {
    class: "board__scroll-sentinel",
    "aria-hidden": "true"
  }, []);
  board.append(sentinel);

  // Query FABs at call time inside the callback — they are appended to the DOM
  // after setupBottomSentinel returns, so capturing them here would yield empty results.
  const getFabs = (): HTMLElement[] =>
    [".theme-toggle", ".locale-btn", ".help-btn", ".drawer-btn"]
      .flatMap(s => Array.from(document.querySelectorAll<HTMLElement>(s)));

  let initialCheck = true;
  let contentIsScrollable = false;

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];
    const fabs = getFabs();

    if (initialCheck) {
      initialCheck = false;
      // Check actual scrollability of the board element, not the initial
      // intersection — scroll restoration (rAF) may have already positioned
      // the sentinel in-view before the observer's first callback fires,
      // causing a false "content fits" reading.
      if (board.scrollHeight <= board.clientHeight) {
        observer.disconnect();
        activeBottomObserver = null;
        return;
      }
      contentIsScrollable = true;
      if (entry.isIntersecting) {
        // User was scrolled to bottom before re-render — hide immediately.
        fabs.forEach(fab => fab.classList.add("board-item--hidden"));
      }
      return;
    }

    if (!contentIsScrollable) return;

    if (entry.isIntersecting) {
      fabs.forEach(fab => fab.classList.add("board-item--hidden"));
    } else {
      fabs.forEach(fab => fab.classList.remove("board-item--hidden"));
    }
  }, { threshold: 0 });

  observer.observe(sentinel);
  activeBottomObserver = observer;
}
