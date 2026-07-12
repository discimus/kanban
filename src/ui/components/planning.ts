import { el, icon, actionsMenu } from "@ui/components/dom";
import { Product } from "@shared/types";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { openProductForm } from "@ui/modal/product-form";
import { productService } from "@contexts/product/application/product.service";

export function renderProductHeader(product: Product): HTMLElement {
  const isLocked = product.status === "completed" || product.status === "canceled";

  const addItem = el("button", { class: "btn btn--primary btn--sm" }, [icon("add"), "Item de backlog"]);
  addItem.addEventListener("click", () => {
    if (isLocked) {
      alert(
        'Este projeto está concluído ou cancelado. Altere o status pelo menu "⋮" → "Editar" para adicionar novos itens.'
      );
      return;
    }
    openBacklogForm(product.id);
  });

  const menu = actionsMenu([
    { label: "Editar", icon: "edit", action: () => openProductForm(product) },
    {
      label: "Excluir",
      icon: "delete",
      danger: true,
      action: () => {
        if (confirm(`Excluir Projeto "${product.name}" e todos os seus dados?`)) {
          productService.delete(product.id);
        }
      }
    }
  ]);

  return el("header", { class: "content__header" }, [
    el("div", {}, [
      el("h2", { class: "content__title" }, [product.name]),
      el("p", { class: "content__subtitle" }, [product.description || "Sem descrição"])
    ]),
    el("div", { class: "content__actions" }, [addItem, menu])
  ]);
}
