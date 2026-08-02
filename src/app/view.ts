import { el, clear, icon } from "@ui/components/dom";
import { productService } from "@contexts/product/application/product.service";
import { renderSidebar } from "@ui/components/sidebar";
import { setupScrollFade } from "@ui/components/scroll-fade";
import { renderProductHeader } from "@ui/components/planning";
import { renderBoard, renderNotesBoard } from "@ui/board/board";
import { renderStatistics } from "@ui/components/statistics";
import { renderThemeMenu } from "@ui/components/theme-menu";
import { renderHelpMenu } from "@ui/components/help-menu";
import { renderLocaleMenu } from "@ui/components/locale-menu";
import { renderDrawerBtn } from "@ui/components/drawer-btn";
import { t } from "@shared/i18n";

const SIDEBAR_WIDTH_KEY = "kanban-sidebar-width";

function loadSidebarWidth(): number {
  try {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= 200 && w <= 500) return w;
    }
  } catch { /* ignore */ }
  return 280;
}

function saveSidebarWidth(w: number): void {
  try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)); } catch { /* ignore */ }
}

let selectedProductId: string | null = null;
let drawerOpen = false;
let showStats = false;
let showArchived = false;
let savedBoardScrollLeft = 0;
let savedBoardScrollTop = 0;
let savedSidebarScrollTop = 0;
let lastRenderedProductId: string | null = null;
let highlightedProductId: string | null = null;
let pendingCardFocus: string | null = null;

const LAST_PROJECT_KEY = "kanban-last-project";

function persistSelection(id: string | null): void {
  try { localStorage.setItem(LAST_PROJECT_KEY, id ?? ""); } catch { /* ignore */ }
}

function clearUrlParam(): void {
  if (window.location.search) {
    history.replaceState(null, "", window.location.pathname);
  }
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
  clearUrlParam();
  renderApp(root);
}

/**
 * Renders the board of `productId` and, right after the next render, scrolls
 * to, highlights and focuses the card identified by `cardId`.
 */
export function focusProductCard(productId: string, cardId: string, root: HTMLElement): void {
  selectedProductId = productId;
  persistSelection(productId);
  clearUrlParam();
  pendingCardFocus = cardId;
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
  const sidebarWidth = loadSidebarWidth();
  layout.style.setProperty("--sidebar-w", `${sidebarWidth}px`);

  const setDrawer = (open: boolean): void => {
    drawerOpen = open;
    layout.classList.toggle("layout--drawer-open", open);
  };

  const resizer = el("div", { class: "sidebar-resizer" }) as HTMLElement;
  const updateResizerPos = (): void => {
    const w = parseFloat(layout.style.getPropertyValue("--sidebar-w")) || sidebarWidth;
    resizer.style.left = `${w}px`;
  };
  updateResizerPos();

  let dragging = false;

  const onPointerDown = (e: PointerEvent): void => {
    if (window.innerWidth <= 720) return;
    dragging = true;
    resizer.classList.add("sidebar-resizer--active");
    resizer.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return;
    const rect = layout.getBoundingClientRect();
    let w = e.clientX - rect.left;
    w = Math.max(200, Math.min(500, w));
    layout.style.setProperty("--sidebar-w", `${w}px`);
    resizer.style.left = `${w}px`;
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove("sidebar-resizer--active");
    resizer.releasePointerCapture(e.pointerId);
    const current = parseFloat(layout.style.getPropertyValue("--sidebar-w"));
    if (!isNaN(current)) saveSidebarWidth(Math.round(current));
  };

  resizer.addEventListener("pointerdown", onPointerDown);
  resizer.addEventListener("pointermove", onPointerMove);
  resizer.addEventListener("pointerup", onPointerUp);

  const products = productService.list();
  const onPinToggle = (id: string, action: "pin" | "unpin") => {
    highlightedProductId = id;
    if (action === "pin") productService.pin(id);
    else productService.unpin(id);
  };
  const sidebar = renderSidebar(products, selectedProductId, (id) => {
    selectedProductId = id;
    persistSelection(id);
    clearUrlParam();
    setDrawer(false);
    renderApp(root);
  }, () => setDrawer(false), () => renderApp(root), onPinToggle, highlightedProductId ?? undefined, () => setDrawer(false));
  highlightedProductId = null;

  const scrim = el("div", { class: "drawer-scrim", "aria-hidden": "true" }, []);
  scrim.addEventListener("click", () => setDrawer(false));

  const hamburger = el("button", { class: "hamburger", "aria-label": t("view.abrirMenu") }, [icon("menu")]);
  hamburger.addEventListener("click", () => setDrawer(!drawerOpen));

  const content = el("main", { class: "content" }, []);

  if (selectedProductId) {
    const p = productService.get(selectedProductId);
    if (p) content.dataset.palette = p.palette;
    content.dataset.productId = selectedProductId;
  }

  if (!selectedProductId) {
    content.append(
      el("header", { class: "content__header" }, [
        el("div", { class: "content__topbar" }, [
          el("div", { class: "content__topbar-start" }, [hamburger]),
          el("div", { class: "content__topbar-end" }, [])
        ])
      ]),
      el("div", { class: "empty-state" }, [
        el("h2", {}, [t("view.bemVindo")]),
        el("p", { class: "muted" }, [t("view.crieProjeto")])
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
          product.category === "notes"
            ? renderNotesBoard(product.id, showArchived, () => renderApp(root))
            : renderBoard(product.id, showArchived, () => renderApp(root))
        )
      );
    }
  }

  layout.append(sidebar, scrim, content, resizer);
  root.append(layout, renderLocaleMenu(), renderThemeMenu(), renderHelpMenu(), renderDrawerBtn(() => setDrawer(true)));

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

    if (pendingCardFocus) {
      const id = pendingCardFocus;
      pendingCardFocus = null;
      const card = root.querySelector<HTMLElement>(`[data-id="${id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        if (!card.hasAttribute("tabindex")) card.tabIndex = -1;
        card.focus({ preventScroll: true });
        card.classList.add("card--focused");
      }
    }
  });
}
