import { el, icon } from "@ui/components/dom";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { stickyCard } from "./sticky-card";
import { isStickyCollapsed, setStickyCollapsed } from "./sticky-collapse";
import { t } from "@shared/i18n";

export function renderStickyRow(productId: string, readOnly: boolean): HTMLElement | null {
  const stickies = stickyService.byProduct(productId);
  if (readOnly && stickies.length === 0) return null;

  const collapsed = isStickyCollapsed(productId);

  const block = el("div", { class: "sticky-block" }, []);

  const header = el("div", { class: "sticky-block__header" }, []);
  const headerChildren: HTMLElement[] = [];

  let row: HTMLElement | null = null;
  if (stickies.length > 0) {
    row = el("div", { class: "sticky-row", id: "sticky-row", hidden: collapsed }, []);
    for (const sticky of stickies) {
      row.append(stickyCard(sticky, readOnly));
    }

    const toggleBtn = el("button", {
      class: "sticky-block__toggle",
      type: "button",
      "aria-expanded": String(!collapsed),
      "aria-controls": "sticky-row",
      title: collapsed ? t("sticky.expandirNotas") : t("sticky.recolherNotas")
    }, [
      icon(collapsed ? "expand_more" : "expand_less"),
      t("sticky.notas", { n: stickies.length })
    ]);
    toggleBtn.addEventListener("click", () => {
      const nextCollapsed = !row!.hidden;
      setStickyCollapsed(productId, nextCollapsed);
      row!.hidden = nextCollapsed;
      toggleBtn.querySelector(".material-symbols-outlined")!.textContent = nextCollapsed ? "expand_more" : "expand_less";
      toggleBtn.setAttribute("aria-expanded", String(!nextCollapsed));
      toggleBtn.title = nextCollapsed ? t("sticky.expandirNotas") : t("sticky.recolherNotas");
    });
    headerChildren.push(toggleBtn);
  } else if (!readOnly) {
    headerChildren.push(el("span", { class: "sticky-block__title" }, [t("sticky.notasLabel")]));
  }

  if (!readOnly) {
    const addBtn = el("button", {
      class: "btn btn--icon sticky-block__add",
      type: "button",
      title: t("sticky.adicionarTitle"),
      "aria-label": t("sticky.adicionarTitle")
    }, [icon("add")]);
    addBtn.addEventListener("click", () => {
      setStickyCollapsed(productId, false);
      const before = stickyService.byProduct(productId);
      stickyService.create({ productId });
      const created = stickyService.byProduct(productId).find((s) => !before.some((b) => b.id === s.id));
      if (created) {
        const cardEl = document.querySelector<HTMLElement>(`.sticky-card[data-id="${created.id}"]`);
        if (cardEl) {
          cardEl.classList.add("card--just-moved");
          setTimeout(() => cardEl.classList.remove("card--just-moved"), 500);
        }
      }
    });
    headerChildren.push(addBtn);
  }

  if (headerChildren.length > 0) {
    header.append(...headerChildren);
    block.append(header);
  }
  if (row) block.append(row);

  return block;
}
