import { el } from "@ui/components/dom";
import { Product } from "@shared/types";
import { openProductForm } from "@ui/modal/product-form";

export function renderSidebar(products: Product[], selectedId: string | null, onSelect: (id: string) => void): HTMLElement {
  const list = el("div", { class: "product-list" }, []);

  if (products.length === 0) {
    list.append(el("p", { class: "muted" }, ["Nenhum produto. Crie o primeiro!"]));
  }

  for (const product of products) {
    const isActive = product.id === selectedId;
    const item = el("button", { class: `product-item ${isActive ? "product-item--active" : ""}` }, [
      el("span", { class: "product-item__name" }, [product.name]),
      el("span", { class: "product-item__desc" }, [product.description || "Sem descrição"])
    ]);
    item.addEventListener("click", () => onSelect(product.id));
    list.append(item);
  }

  const addBtn = el("button", { class: "btn btn--primary btn--block" }, ["+ Novo produto"]);
  addBtn.addEventListener("click", () => openProductForm());

  return el("aside", { class: "sidebar" }, [
    el("h1", { class: "sidebar__brand" }, ["Kanban DDD"]),
    el("p", { class: "sidebar__subtitle" }, ["Gestão ágil Scrum"]),
    addBtn,
    el("h2", { class: "sidebar__section" }, ["Produtos"]),
    list
  ]);
}
