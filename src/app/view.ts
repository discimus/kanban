import { el, clear } from "@ui/components/dom";
import { productService } from "@contexts/product/application/product.service";
import { renderSidebar } from "@ui/components/sidebar";
import { renderProductHeader } from "@ui/components/planning";
import { renderBoard } from "@ui/board/board";
import { renderThemeMenu } from "@ui/components/theme-menu";

let selectedProductId: string | null = null;

function ensureSelection(): void {
  const products = productService.list();
  if (products.length === 0) {
    selectedProductId = null;
    return;
  }
  if (!selectedProductId || !products.some((p) => p.id === selectedProductId)) {
    selectedProductId = products[0].id;
  }
}

export function renderApp(root: HTMLElement): void {
  ensureSelection();
  clear(root);

  const products = productService.list();
  const sidebar = renderSidebar(products, selectedProductId, (id) => {
    selectedProductId = id;
    renderApp(root);
  });

  const content = el("main", { class: "content" }, []);

  if (!selectedProductId) {
    content.append(
      el("div", { class: "empty-state" }, [
        el("h2", {}, ["Bem-vindo ao Kanban DDD"]),
        el("p", { class: "muted" }, ["Crie um produto na barra lateral para começar."])
      ])
    );
  } else {
    const product = productService.get(selectedProductId);
    if (product) {
      content.append(renderProductHeader(product), renderBoard(product.id));
    }
  }

  root.append(el("div", { class: "layout" }, [sidebar, content]), renderThemeMenu());
}
