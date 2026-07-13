import { el, clear, icon } from "@ui/components/dom";
import { productService } from "@contexts/product/application/product.service";
import { renderSidebar } from "@ui/components/sidebar";
import { renderProductHeader } from "@ui/components/planning";
import { renderBoard } from "@ui/board/board";
import { renderStatistics } from "@ui/components/statistics";
import { renderThemeMenu } from "@ui/components/theme-menu";

let selectedProductId: string | null = null;
let drawerOpen = false;
let showStats = false;
let showArchived = false;

const LAST_PROJECT_KEY = "kanban-last-project";

function persistSelection(id: string | null): void {
  try { localStorage.setItem(LAST_PROJECT_KEY, id ?? ""); } catch { /* ignore */ }
  const url = id ? `?project=${id}` : window.location.pathname;
  history.replaceState(null, "", url);
}

function ensureSelection(): void {
  const products = productService.list();
  if (products.length === 0) {
    selectedProductId = null;
    persistSelection(null);
    return;
  }

  const urlParam = new URLSearchParams(window.location.search).get("project");
  if (urlParam && products.some((p) => p.id === urlParam)) {
    selectedProductId = urlParam;
    persistSelection(urlParam);
    return;
  }

  const saved = localStorage.getItem(LAST_PROJECT_KEY);
  if (saved && products.some((p) => p.id === saved)) {
    selectedProductId = saved;
    persistSelection(saved);
    return;
  }

  selectedProductId = products[0].id;
  persistSelection(selectedProductId);
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
    persistSelection(id);
    setDrawer(false);
    renderApp(root);
  });

  const scrim = el("div", { class: "drawer-scrim", "aria-hidden": "true" }, []);
  scrim.addEventListener("click", () => setDrawer(false));

  const hamburger = el("button", { class: "hamburger", "aria-label": "Abrir menu de projetos" }, [icon("menu")]);
  hamburger.addEventListener("click", () => setDrawer(!drawerOpen));

  const content = el("main", { class: "content" }, []);

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
      content.append(
        renderProductHeader(product, showStats, () => {
          showStats = !showStats;
          renderApp(root);
        }, hamburger, showArchived, () => {
          showArchived = !showArchived;
          renderApp(root);
        }),
        showStats ? renderStatistics(product.id) : renderBoard(product.id, showArchived)
      );
    }
  }

  layout.append(sidebar, scrim, content);
  root.append(layout, renderThemeMenu());
}
