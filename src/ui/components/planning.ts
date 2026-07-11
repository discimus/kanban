import { el, icon } from "@ui/components/dom";
import { Product } from "@shared/types";
import { releaseService } from "@contexts/release/application/release.service";
import { backlogService } from "@contexts/product/application/backlog.service";
import { openReleaseForm } from "@ui/modal/release-form";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { openProductForm } from "@ui/modal/product-form";
import { productService } from "@contexts/product/application/product.service";
import { formatDate } from "@shared/utils";

export function renderPlanningPanel(product: Product): HTMLElement {
  const panel = el("div", { class: "planning" }, []);
  panel.append(buildReleases(product));
  return panel;
}

function buildReleases(product: Product): HTMLElement {
  const releases = releaseService.byProduct(product.id);
  const list = el("div", { class: "planning__list" }, []);

  if (releases.length === 0) {
    list.append(el("p", { class: "muted" }, ["Nenhuma release."]));
  }

  for (const release of releases) {
    const count = backlogService.byProduct(product.id).filter((b) => b.releaseId === release.id).length;
    const actions = el("div", { class: "planning__actions" }, []);

    if (release.status === "planned") {
      const finalize = el("button", { class: "btn btn--sm btn--ghost" }, [icon("check"), "Finalizar"]);
      finalize.addEventListener("click", () => releaseService.finalize(release.id));
      actions.append(finalize);
    }
    const del = el("button", { class: "btn btn--sm btn--danger", "aria-label": "Excluir release" }, [icon("delete")]);
    del.addEventListener("click", () => {
      if (confirm(`Excluir release "${release.name}"?`)) releaseService.delete(release.id);
    });
    actions.append(del);

    list.append(
      el("div", { class: "planning__item" }, [
        el("div", { class: "planning__head" }, [
          el("strong", {}, [`${release.name} (${release.version})`]),
          el("span", { class: `status status--${release.status}` }, [release.status])
        ]),
        el("p", { class: "planning__dates" }, [`${formatDate(release.releaseDate)} · ${count} itens`]),
        actions
      ])
    );
  }

  const add = el("button", { class: "btn btn--sm btn--block" }, [icon("add"), "Nova release"]);
  add.addEventListener("click", () => openReleaseForm(product.id));

  return el("section", { class: "planning__group" }, [el("h3", {}, ["Releases"]), list, add]);
}

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

  const header = el("header", { class: "content__header" }, [
    el("div", {}, [
      el("h2", { class: "content__title" }, [product.name]),
      el("p", { class: "content__subtitle" }, [product.description || "Sem descrição"])
    ]),
    el("div", { class: "content__actions" }, [addItem, editBtn, deleteBtn])
  ]);

  return el("div", {}, [header, el("div", { class: "content__planning" }, [renderPlanningPanel(product)])]);
}
