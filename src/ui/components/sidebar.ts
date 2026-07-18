import { el, icon, clear } from "@ui/components/dom";
import { Product, ProductStatus, ProductCategory, PRODUCT_STATUSES, PRODUCT_CATEGORIES } from "@shared/types";
import { openProductForm } from "@ui/modal/product-form";
import { openNotesForm } from "@ui/modal/notes-form";

let archivedOpen = false;
let filterCategory: ProductCategory | null = null;

type SortOption = "name-asc" | "name-desc" | "created-desc" | "created-asc";
let sortBy: SortOption = "name-asc";

const STATUS_ICONS: Record<ProductStatus, string> = {
  backlog: "inbox",
  in_progress: "autorenew",
  completed: "check_circle",
  canceled: "cancel"
};

function statusLabel(status: ProductStatus): string {
  return PRODUCT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function categoryLabel(cat: ProductCategory): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function categoryIcon(cat: ProductCategory): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === cat)?.icon ?? "help";
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Nome A-Z" },
  { value: "name-desc", label: "Nome Z-A" },
  { value: "created-desc", label: "Mais recente" },
  { value: "created-asc", label: "Mais antigo" }
];

function renderFilterBar(onChange?: () => void): HTMLElement {
  const bar = el("div", { class: "filter-bar" }, []);

  const chips = el("div", { class: "filter-bar--chips" }, []);

  const allChip = el("button", {
    class: `chip chip--filter${filterCategory === null ? " chip--selected" : ""}`,
    type: "button"
  }, ["Todas"]);
  allChip.addEventListener("click", () => {
    if (filterCategory !== null) {
      filterCategory = null;
      onChange?.();
    }
  });
  chips.append(allChip);

  for (const cat of PRODUCT_CATEGORIES) {
    const isSelected = filterCategory === cat.value;
    const chip = el("button", {
      class: `chip chip--compact${isSelected ? ` chip--${cat.value} chip--selected` : " chip--filter"}`,
      type: "button",
      title: cat.label
    }, [icon(cat.icon)]);
    chip.addEventListener("click", () => {
      filterCategory = filterCategory === cat.value ? null : cat.value;
      onChange?.();
    });
    chips.append(chip);
  }

  bar.append(chips);

  const wrapper = el("div", { class: "sort-wrapper" }, []);
  const current = SORT_OPTIONS.find(o => o.value === sortBy)!;
  const sortBtn = el("button", {
    class: "sort-btn sort-btn--compact",
    type: "button",
    title: `Ordenar: ${current.label}`
  }, [icon("sort")]);
  const sortMenu = el("div", { class: "sort-menu" }, []);

  const renderMenu = (): void => {
    clear(sortMenu);
    for (const opt of SORT_OPTIONS) {
      const item = el("button", {
        class: `sort-menu__item${opt.value === sortBy ? " sort-menu__item--selected" : ""}`,
        type: "button"
      }, [opt.label]);
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        sortBy = opt.value;
        sortBtn.title = `Ordenar: ${opt.label}`;
        sortMenu.classList.remove("sort-menu--open");
        onChange?.();
      });
      sortMenu.append(item);
    }
  };

  renderMenu();

  let outsideHandler: ((e: Event) => void) | null = null;

  const closeMenu = (): void => {
    sortMenu.classList.remove("sort-menu--open");
    if (outsideHandler) {
      document.removeEventListener("click", outsideHandler);
      outsideHandler = null;
    }
  };

  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = sortMenu.classList.contains("sort-menu--open");
    if (isOpen) {
      closeMenu();
    } else {
      renderMenu();
      sortMenu.classList.add("sort-menu--open");
      outsideHandler = (ev: Event) => {
        if (!wrapper.contains(ev.target as Node)) closeMenu();
      };
      setTimeout(() => document.addEventListener("click", outsideHandler!), 0);
    }
  });

  wrapper.append(sortBtn, sortMenu);
  bar.append(wrapper);

  return bar;
}

const FADE_SIZE = 36;

function updateScrollFade(el: HTMLElement): void {
  const { scrollTop, scrollHeight, clientHeight } = el;

  if (scrollHeight <= clientHeight) {
    el.style.removeProperty("mask-image");
    el.style.removeProperty("-webkit-mask-image");
    return;
  }

  const topFade = scrollTop > 0 ? Math.min(scrollTop, FADE_SIZE) : 0;
  const bottomRemaining = scrollHeight - scrollTop - clientHeight;
  const bottomFade = bottomRemaining > 0 ? Math.min(bottomRemaining, FADE_SIZE) : 0;

  const mask = `linear-gradient(to bottom, transparent 0%, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent 100%)`;
  el.style.maskImage = mask;
  el.style.webkitMaskImage = mask;
}

export function setupScrollFade(el: HTMLElement): void {
  const handler = (): void => updateScrollFade(el);
  el.addEventListener("scroll", handler, { passive: true });
  requestAnimationFrame(() => handler());
}

export function renderSidebar(products: Product[], selectedId: string | null, onSelect: (id: string) => void, onNewProject?: () => void, onFilterChange?: () => void): HTMLElement {
  let active = products.filter(p => !p.archivedAt);

  if (filterCategory !== null) {
    active = active.filter(p => p.category === filterCategory);
  }

  active = [...active].sort((a, b) => {
    switch (sortBy) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "created-desc": return b.createdAt.localeCompare(a.createdAt);
      case "created-asc": return a.createdAt.localeCompare(b.createdAt);
    }
  });

  const archived = products.filter(p => p.archivedAt);

  const list = el("div", { class: "product-list" }, []);

  if (active.length === 0 && archived.length === 0) {
    list.append(el("p", { class: "muted" }, ["Nenhum Projeto. Crie o primeiro!"]));
  }

  for (const product of active) {
    const isActive = product.id === selectedId;
    const status = product.status ?? "backlog";
    const item = el("button", { class: `product-item ${isActive ? "product-item--active" : ""}` }, [
      el("span", { class: "product-item__name" }, [
        el("span", { class: `product-item__category product-item__category--${product.category}`, title: categoryLabel(product.category) }, [
          icon(categoryIcon(product.category))
        ]),
        el("span", { class: "product-item__name-text" }, [product.name]),
        el("span", { class: `product-item__status product-item__status--${status}` }, [
          icon(STATUS_ICONS[status]),
          statusLabel(status)
        ])
      ]),
      el("span", { class: "product-item__desc" }, [
        product.description || "Sem descrição"
      ])
    ]);
    item.addEventListener("click", () => onSelect(product.id));
    list.append(item);
  }

  if (archived.length > 0) {
    const archivedBody = el("div", { class: "sidebar__archived-body", hidden: !archivedOpen }, []);

    const renderArchived = (): void => {
      clear(archivedBody);
      for (const product of archived) {
        const isActive = product.id === selectedId;
        const row = el("button", { class: `product-item product-item--archived ${isActive ? "product-item--active" : ""}` }, [
          el("span", { class: "product-item__name" }, [
            el("span", { class: `product-item__category product-item__category--${product.category}`, title: categoryLabel(product.category) }, [
              icon(categoryIcon(product.category))
            ]),
            el("span", { class: "product-item__name-text" }, [product.name])
          ])
        ]);
        row.addEventListener("click", () => onSelect(product.id));
        archivedBody.append(row);
      }
    };
    renderArchived();

    const headerBtn = el("button", { class: "sidebar__archived-toggle", type: "button" }, [
      icon(archivedOpen ? "expand_more" : "chevron_right"),
      `Projetos arquivados (${archived.length})`
    ]);
    headerBtn.addEventListener("click", () => {
      archivedOpen = !archivedOpen;
      headerBtn.querySelector(".material-symbols-outlined")!.textContent = archivedOpen ? "expand_more" : "chevron_right";
      archivedBody.hidden = !archivedOpen;
    });

    list.append(headerBtn, archivedBody);
  }

  const addBtn = el("button", { class: "btn btn--primary", title: "Criar nova board de projeto" }, [icon("add"), "Novo Projeto"]);
  addBtn.addEventListener("click", () => {
    onNewProject?.();
    openProductForm();
  });

  const notesBtn = el("button", { class: "btn btn--icon btn--notes", type: "button", title: "Criar nova board de notas" }, [icon("note_stack_add")]);
  notesBtn.addEventListener("click", () => {
    onNewProject?.();
    openNotesForm();
  });

  const actionsBar = el("div", { class: "sidebar__actions" }, [addBtn, notesBtn]);

  return el("aside", { class: "sidebar" }, [
    el("h1", { class: "sidebar__brand" }, [icon("dashboard"), "Kanban"]),
    el("p", { class: "sidebar__subtitle" }, ["Dashboard de gestão de projetos"]),
    actionsBar,
    el("h2", { class: "sidebar__section" }, ["Projetos"]),
    renderFilterBar(onFilterChange),
    list
  ]);
}
