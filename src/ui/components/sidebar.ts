import { el, icon } from "@ui/components/dom";
import { Product, ProductStatus, PRODUCT_STATUSES } from "@shared/types";
import { openProductForm } from "@ui/modal/product-form";

const STATUS_ICONS: Record<ProductStatus, string> = {
  backlog: "inbox",
  in_progress: "autorenew",
  completed: "check_circle",
  canceled: "cancel"
};

function statusLabel(status: ProductStatus): string {
  return PRODUCT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function renderSidebar(products: Product[], selectedId: string | null, onSelect: (id: string) => void): HTMLElement {
  const list = el("div", { class: "product-list" }, []);

  if (products.length === 0) {
    list.append(el("p", { class: "muted" }, ["Nenhum Projeto. Crie o primeiro!"]));
  }

  for (const product of products) {
    const isActive = product.id === selectedId;
    const status = product.status ?? "backlog";
    const item = el("button", { class: `product-item ${isActive ? "product-item--active" : ""}` }, [
      el("span", { class: "product-item__name" }, [
        el("span", { class: "product-item__name-text" }, [product.name]),
        el("span", { class: `product-item__status product-item__status--${status}` }, [
          icon(STATUS_ICONS[status]),
          statusLabel(status)
        ])
      ]),
      el("span", { class: "product-item__desc" }, [product.description || "Sem descrição"])
    ]);
    item.addEventListener("click", () => onSelect(product.id));
    list.append(item);
  }

  const addBtn = el("button", { class: "btn btn--primary btn--block" }, [icon("add"), "Novo Projeto"]);
  addBtn.addEventListener("click", () => openProductForm());

  return el("aside", { class: "sidebar" }, [
    el("h1", { class: "sidebar__brand" }, [icon("dashboard"), "Kanban"]),
    el("p", { class: "sidebar__subtitle" }, ["Gestão ágil Scrum"]),
    addBtn,
    el("h2", { class: "sidebar__section" }, ["Projetos"]),
    list
  ]);
}
