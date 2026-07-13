import { el, icon, actionsMenu } from "@ui/components/dom";
import { Product } from "@shared/types";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { openProductForm } from "@ui/modal/product-form";
import { productService } from "@contexts/product/application/product.service";
import { showAlert, showConfirm } from "@ui/components/dialog";
import { downloadExportProduct } from "@contexts/product/application/export.service";

export function renderProductHeader(
  product: Product,
  showStats = false,
  onToggleStats?: () => void,
  hamburger?: HTMLElement,
  showArchived = false,
  onToggleArchived?: () => void
): HTMLElement {
  const isLocked = product.status === "completed" || product.status === "canceled";

  const addItem = el("button", { class: "btn btn--primary btn--sm" }, [icon("add"), "Adicionar tarefa"]);
  addItem.addEventListener("click", () => {
    if (isLocked) {
      showAlert(
        'Este projeto está concluído ou cancelado. Altere o status pelo menu "⋮" → "Editar" para adicionar novos itens.'
      );
      return;
    }
    openBacklogForm(product.id);
  });

  const statBtn = onToggleStats
    ? el("button", { class: `btn btn--sm${showStats ? " btn--primary" : ""}` }, [
        icon("bar_chart"),
        "Estatísticas"
      ])
    : null;
  if (statBtn) {
    statBtn.addEventListener("click", onToggleStats!);
  }

  const archBtn = onToggleArchived
    ? el("button", { class: `btn btn--sm${showArchived ? " btn--primary" : ""}` }, [
        icon("archive"),
        "Arquivadas"
      ])
    : null;
  if (archBtn) {
    archBtn.addEventListener("click", onToggleArchived!);
  }

  const menu = actionsMenu([
    { label: "Editar", icon: "edit", action: () => openProductForm(product) },
    { label: "Exportar", icon: "download", action: () => downloadExportProduct(product.name, product.id) },
    {
      label: "Excluir",
      icon: "delete",
      danger: true,
      action: () => {
        showConfirm('Excluir Projeto "{{text}}" e todos os seus dados?', product.name).then((ok) => {
          if (ok) productService.delete(product.id);
        });
      }
    }
  ]);

  const topBar = el("div", { class: "content__topbar" }, [
    hamburger,
    el("h2", { class: "content__title" }, [product.name]),
    el("div", { class: "content__actions" }, [addItem, statBtn, archBtn, menu].filter(Boolean) as HTMLElement[])
  ].filter(Boolean) as HTMLElement[]);

  return el("header", { class: "content__header" }, [
    topBar,
    el("p", { class: "content__subtitle" }, [product.description || "Sem descrição"])
  ]);
}
