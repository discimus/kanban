import { el, clear, icon } from "@ui/components/dom";
import { productService } from "@contexts/product/application/product.service";
import { renderSidebar, setupScrollFade } from "@ui/components/sidebar";
import { renderProductHeader } from "@ui/components/planning";
import { renderBoard, renderNotesBoard } from "@ui/board/board";
import { renderStatistics } from "@ui/components/statistics";
import { renderThemeMenu } from "@ui/components/theme-menu";
import { renderHelpMenu } from "@ui/components/help-menu";

let selectedProductId: string | null = null;
let drawerOpen = false;
let showStats = false;
let showArchived = false;
let savedBoardScrollLeft = 0;
let savedBoardScrollTop = 0;
let savedSidebarScrollTop = 0;
let lastRenderedProductId: string | null = null;

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

export function forceSelectProduct(id: string, root: HTMLElement): void {
  selectedProductId = id;
  persistSelection(id);
  renderApp(root);
}

export function renderApp(root: HTMLElement): void {
  const projectChanged = selectedProductId !== lastRenderedProductId;

  if (!projectChanged) {
    const prevBoard = root.querySelector(".board");
    if (prevBoard) {
      savedBoardScrollLeft = prevBoard.scrollLeft;
      savedBoardScrollTop = prevBoard.scrollTop;
    }
  }

  const prevList = root.querySelector(".product-list");
  if (prevList) savedSidebarScrollTop = prevList.scrollTop;

  ensureSelection();
  lastRenderedProductId = selectedProductId;
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
  }, () => setDrawer(false), () => renderApp(root));

  const scrim = el("div", { class: "drawer-scrim", "aria-hidden": "true" }, []);
  scrim.addEventListener("click", () => setDrawer(false));

  const hamburger = el("button", { class: "hamburger", "aria-label": "Abrir menu de projetos" }, [icon("menu")]);
  hamburger.addEventListener("click", () => setDrawer(!drawerOpen));

  const content = el("main", { class: "content" }, []);

  if (!selectedProductId) {
    content.append(
      el("header", { class: "content__header" }, [
        el("div", { class: "content__topbar" }, [
          el("div", { class: "content__topbar-start" }, [hamburger]),
          el("div", { class: "content__topbar-end" }, [])
        ])
      ]),
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
        }, () => {
          if (product.archivedAt) {
            productService.restore(product.id);
          } else {
            productService.archive(product.id);
          }
          renderApp(root);
        }),
        showStats ? renderStatistics(product.id) : (
          product.boardMode === "notes"
            ? renderNotesBoard(product.id, showArchived, () => renderApp(root))
            : renderBoard(product.id, showArchived, () => renderApp(root))
        )
      );
    }
  }

  layout.append(sidebar, scrim, content);
  root.append(layout, renderThemeMenu(), renderHelpMenu());

  requestAnimationFrame(() => {
    const list = root.querySelector(".product-list");
    if (list) {
      list.scrollTop = savedSidebarScrollTop;
      setupScrollFade(list as HTMLElement);
    }

    if (!projectChanged) {
      const board = root.querySelector(".board");
      if (board) {
        board.scrollLeft = savedBoardScrollLeft;
        board.scrollTop = savedBoardScrollTop;
      }
    }
  });
}
