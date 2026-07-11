import { el, icon } from "@ui/components/dom";
import { Product } from "@shared/types";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { openProductForm } from "@ui/modal/product-form";
import { productService } from "@contexts/product/application/product.service";

export function renderProductHeader(product: Product): HTMLElement {
  const editBtn = el("button", { class: "btn btn--ghost btn--sm" }, [icon("edit"), "Editar"]);
  editBtn.addEventListener("click", () => openProductForm(product));

  const deleteBtn = el("button", { class: "btn btn--danger btn--sm" }, [icon("delete"), "Excluir"]);
  deleteBtn.addEventListener("click", () => {
    if (confirm(`Excluir produto "${product.name}" e todos os seus dados?`)) {
      productService.delete(product.id);
    }
  });

  const addItem = el("button", { class: "btn btn--primary btn--sm" }, [icon("add"), "Item de backlog"]);
  addItem.addEventListener("click", () => openBacklogForm(product.id));

  return el("header", { class: "content__header" }, [
    el("div", {}, [
      el("h2", { class: "content__title" }, [product.name]),
      el("p", { class: "content__subtitle" }, [product.description || "Sem descrição"])
    ]),
    el("div", { class: "content__actions" }, [addItem, editBtn, deleteBtn])
  ]);
}
