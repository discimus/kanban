import { el, icon, clear } from "@ui/components/dom";
import { Product, ProductStatus, ProductCategory, PRODUCT_STATUSES, PRODUCT_CATEGORIES } from "@shared/types";
import { openProductForm } from "@ui/modal/product-form";

let archivedOpen = false;

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

export function renderSidebar(products: Product[], selectedId: string | null, onSelect: (id: string) => void, onNewProject?: () => void): HTMLElement {
  const active = products.filter(p => !p.archivedAt);
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

  const addBtn = el("button", { class: "btn btn--primary btn--block" }, [icon("add"), "Novo Projeto"]);
  addBtn.addEventListener("click", () => {
    onNewProject?.();
    openProductForm();
  });

  return el("aside", { class: "sidebar" }, [
    el("h1", { class: "sidebar__brand" }, [icon("dashboard"), "Kanban"]),
    el("p", { class: "sidebar__subtitle" }, ["Dashboard de gestão de projetos"]),
    addBtn,
    el("h2", { class: "sidebar__section" }, ["Projetos"]),
    list
  ]);
}
