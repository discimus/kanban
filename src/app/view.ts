import { el, clear, icon } from "@ui/components/dom";
import { productService } from "@contexts/product/application/product.service";
import { renderSidebar } from "@ui/components/sidebar";
import { renderProductHeader } from "@ui/components/planning";
import { renderBoard } from "@ui/board/board";
import { renderThemeMenu } from "@ui/components/theme-menu";

let selectedProductId: string | null = null;
let drawerOpen = false;

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

  const layout = el("div", { class: `layout${drawerOpen ? " layout--drawer-open" : ""}` }, []);

  const setDrawer = (open: boolean): void => {
    drawerOpen = open;
    layout.classList.toggle("layout--drawer-open", open);
  };

  const products = productService.list();

  const sidebar = renderSidebar(products, selectedProductId, (id) => {
    selectedProductId = id;
    setDrawer(false);
    renderApp(root);
  });

  const scrim = el("div", { class: "drawer-scrim", "aria-hidden": "true" }, []);
  scrim.addEventListener("click", () => setDrawer(false));

  const hamburger = el("button", { class: "hamburger", "aria-label": "Abrir menu de projetos" }, [icon("menu")]);
  hamburger.addEventListener("click", () => setDrawer(!drawerOpen));

  const content = el("main", { class: "content" }, [hamburger]);

  if (!selectedProductId) {
    content.append(
      el("div", { class: "empty-state" }, [
        el("h2", {}, ["Bem-vindo ao Kanban"]),
        el("p", { class: "muted" }, ["Crie um Projeto na barra lateral para começar."])
      ])
    );
  } else {
    const product = productService.get(selectedProductId);
    if (product) {
      content.append(renderProductHeader(product), renderBoard(product.id));
    }
  }

  layout.append(sidebar, scrim, content);
  root.append(layout, renderThemeMenu());
}
