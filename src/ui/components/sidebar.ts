import { el, icon, clear } from "@ui/components/dom";
import { spinner } from "@ui/components/spinner";
import { openModal, closeModal } from "../modal";
import { Product, ProductStatus, ProductCategory, PALETTES, PRODUCT_STATUSES, PRODUCT_CATEGORIES } from "@shared/types";
import { productService } from "@contexts/product/application/product.service";
import { openProductForm } from "@ui/modal/product-form";
import { openNotesForm } from "@ui/modal/notes-form";
import { getStorageUsage, ensureStorageQuotaLoaded, isStorageQuotaLoaded } from "@shared/storage/storage-usage";
import { t, loc } from "@shared/i18n";

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
  const found = PRODUCT_STATUSES.find((s) => s.value === status);
  return found ? loc(found) : status;
}

function categoryLabel(cat: ProductCategory): string {
  const found = PRODUCT_CATEGORIES.find((c) => c.value === cat);
  return found ? loc(found) : cat;
}

function categoryIcon(cat: ProductCategory): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === cat)?.icon ?? "help";
}

function paletteSeed(id: string): string {
  return PALETTES.find((p) => p.id === id)?.seed ?? "#4f5bd5";
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Nome A-Z" },
  { value: "name-desc", label: "Nome Z-A" },
  { value: "created-desc", label: "Mais recente" },
  { value: "created-asc", label: "Mais antigo" }
];

const SORT_LABELS: Record<SortOption, string> = {
  "name-asc": "sidebar.sort.nameAsc",
  "name-desc": "sidebar.sort.nameDesc",
  "created-desc": "sidebar.sort.recent",
  "created-asc": "sidebar.sort.oldest",
};

function renderFilterBar(onChange?: () => void): HTMLElement {
  const bar = el("div", { class: "filter-bar" }, []);

  const chips = el("div", { class: "filter-bar--chips" }, []);

  const allChip = el("button", {
    class: `chip chip--filter${filterCategory === null ? " chip--selected" : ""}`,
    type: "button"
  }, [t("sidebar.todas")]);
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
  const sortBtn = el("button", {
    class: "sort-btn sort-btn--compact",
    type: "button",
    title: t("sidebar.ordenar") + " " + t(SORT_LABELS[sortBy])
  }, [icon("sort")]);
  const sortMenu = el("div", { class: "sort-menu" }, []);

  const renderMenu = (): void => {
    clear(sortMenu);
    for (const opt of SORT_OPTIONS) {
      const item = el("button", {
        class: `sort-menu__item${opt.value === sortBy ? " sort-menu__item--selected" : ""}`,
        type: "button"
      }, [t(SORT_LABELS[opt.value])]);
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        sortBy = opt.value;
        sortBtn.title = t("sidebar.ordenar") + " " + t(SORT_LABELS[opt.value]);
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

export function renderSidebar(products: Product[], selectedId: string | null, onSelect: (id: string) => void, onNewProject?: () => void, onFilterChange?: () => void, onPinToggle?: (id: string, action: "pin" | "unpin") => void, highlightedId?: string, onOpenStorage?: () => void): HTMLElement {
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

  // Pinned projects first, preserving sort within each group
  const pinned = active.filter(p => p.pinnedAt);
  const unpinned = active.filter(p => !p.pinnedAt);
  active = [...pinned, ...unpinned];

  const archived = products.filter(p => p.archivedAt);

  const list = el("div", { class: "product-list" }, []);

  if (active.length === 0 && archived.length === 0) {
    list.append(el("p", { class: "muted" }, [t("sidebar.nenhumProjeto")]));
  }

  for (const product of active) {
    const isActive = product.id === selectedId;
    const status = product.status ?? "backlog";
    const isPinned = !!product.pinnedAt;

    const pinBtn = el("button", {
      class: `product-item__pin${isPinned ? " product-item__pin--pinned" : ""}`,
      type: "button",
      "aria-label": isPinned ? t("sidebar.despin") : t("sidebar.pin"),
      title: isPinned ? t("sidebar.despin") : t("sidebar.pin")
    }, [icon("push_pin")]);
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (onPinToggle) {
        onPinToggle(product.id, product.pinnedAt ? "unpin" : "pin");
      } else if (product.pinnedAt) {
        productService.unpin(product.id);
      } else {
        productService.pin(product.id);
      }
    });

    const item = el("button", { class: `product-item ${isActive ? "product-item--active" : ""}${product.id === highlightedId ? " product-item--highlight" : ""}` }, [
      el("span", { class: "product-item__content" }, [
        el("span", { class: "product-item__name" }, [
          el("span", { class: `product-item__category product-item__category--${product.category}`, title: categoryLabel(product.category) }, [
            icon(categoryIcon(product.category))
          ]),
          el("span", { class: "product-item__palette", style: `background:${paletteSeed(product.palette)}` }),
          el("span", { class: "product-item__name-text" }, [product.name]),
          product.category !== "notes" ? el("span", { class: `product-item__status product-item__status--${status}` }, [
            icon(STATUS_ICONS[status]),
            statusLabel(status)
          ]) : null
        ]),
        el("span", { class: "product-item__desc" }, [
          product.description || t("sidebar.semDescricao")
        ])
      ]),
      pinBtn
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
            el("span", { class: "product-item__palette", style: `background:${paletteSeed(product.palette)}` }),
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
      t("sidebar.projetosArquivados", { n: archived.length })
    ]);
    headerBtn.addEventListener("click", () => {
      archivedOpen = !archivedOpen;
      headerBtn.querySelector(".material-symbols-outlined")!.textContent = archivedOpen ? "expand_more" : "chevron_right";
      archivedBody.hidden = !archivedOpen;
    });

    list.append(headerBtn, archivedBody);
  }

  const addBtn = el("button", { class: "btn btn--primary", title: t("sidebar.novaBoardProjeto") }, [icon("add"), t("sidebar.novoProjeto")]);
  addBtn.addEventListener("click", () => {
    onNewProject?.();
    openProductForm();
  });

  const notesBtn = el("button", { class: "btn btn--icon btn--notes", type: "button", title: t("sidebar.novaBoardNotas") }, [icon("note_stack_add")]);
  notesBtn.addEventListener("click", () => {
    onNewProject?.();
    openNotesForm();
  });

  const actionsBar = el("div", { class: "sidebar__actions" }, [addBtn, notesBtn]);

  const storage = getStorageUsage();
  const storageLabel = t("sidebar.armazenamento");
  const storageValueText = el("span", { class: "sidebar__storage-value-text" }, [storage.label]);
  const storageFill = el("span", {
    class: `sidebar__storage-fill${storage.percentage >= 90 ? " sidebar__storage-fill--warn" : ""}`,
    style: `width:${storage.percentage}%`
  });
  const storageBar = el("button", {
    class: "sidebar__storage sidebar__storage--clickable",
    type: "button",
    title: t("sidebar.verCardsComMidia"),
    "aria-label": t("sidebar.verCardsComMidia")
  }, [
    el("span", { class: "sidebar__storage-header" }, [
      el("span", { class: "sidebar__storage-label" }, [storageLabel]),
      el("span", { class: "sidebar__storage-value" }, [
        storageValueText,
        icon("chevron_right", "sidebar__storage-chevron")
      ])
    ]),
    el("span", { class: "sidebar__storage-bar" }, [storageFill])
  ]);
  if (!isStorageQuotaLoaded()) {
    void ensureStorageQuotaLoaded().then((loaded) => {
      if (!loaded || !storageValueText.isConnected) return;
      const q = getStorageUsage();
      storageValueText.textContent = q.label;
      storageFill.style.width = `${q.percentage}%`;
      storageFill.classList.toggle("sidebar__storage-fill--warn", q.percentage >= 90);
    });
  }
  let storageLoading = false;
  const resetStorageLoading = (): void => {
    storageLoading = false;
    storageBar.disabled = false;
    storageBar.removeAttribute("aria-busy");
    storageBar.classList.remove("sidebar__storage--loading");
    const cur = storageBar.querySelector<HTMLElement>(".sidebar__storage-spinner");
    if (cur) cur.replaceWith(icon("chevron_right", "sidebar__storage-chevron"));
  };

  storageBar.addEventListener("click", () => {
    if (storageLoading) return;
    onOpenStorage?.();
    storageLoading = true;
    storageBar.disabled = true;
    storageBar.setAttribute("aria-busy", "true");
    storageBar.classList.add("sidebar__storage--loading");
    const chevron = storageBar.querySelector<HTMLElement>(".sidebar__storage-chevron");
    if (chevron) chevron.replaceWith(spinner("sidebar__storage-spinner", t("storage.carregando")));

    const loadingBody = el("div", { class: "storage-cards__loading" }, [
      spinner("storage-cards__loading-spinner", t("storage.carregando")),
      el("p", { class: "storage-cards__loading-label" }, [t("storage.carregando")])
    ]);
    openModal({ title: t("storage.cardsComMidia"), body: loadingBody, onClose: resetStorageLoading });

    import("@ui/modal/storage-cards")
      .then(({ fillStorageCardsModal }) => fillStorageCardsModal(loadingBody))
      .catch(() => closeModal())
      .finally(resetStorageLoading);
  });
  storageBar.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      storageBar.click();
    }
  });

  return el("aside", { class: "sidebar" }, [
    el("h1", { class: "sidebar__brand" }, [icon("dashboard"), t("sidebar.brand")]),
    el("p", { class: "sidebar__subtitle" }, [t("sidebar.subtitle")]),
    actionsBar,
    el("h2", { class: "sidebar__section" }, [t("sidebar.projetos")]),
    renderFilterBar(onFilterChange),
    list,
    storageBar
  ]);
}
