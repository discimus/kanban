import { el, icon } from "@ui/components/dom";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { stickyCard } from "./sticky-card";
import { getStickyRowMode, toggleStickyRowMode } from "./sticky-row-mode";
import { eventBus } from "@shared/events";
import { t } from "@shared/i18n";

function renderStickyToggle(): HTMLElement {
  const mode = getStickyRowMode();

  const toggleBtn = el("button", {
    class: "btn btn--sm btn--icon sticky-toggle",
    type: "button",
    title: mode === "inline" ? t("sticky.paraWrap") : t("sticky.paraInline"),
    "aria-label": mode === "inline" ? t("sticky.paraWrap") : t("sticky.paraInline")
  }, [icon(mode === "inline" ? "grid_view" : "view_stream")]);
  toggleBtn.addEventListener("click", () => {
    toggleStickyRowMode();
    eventBus.emit("state:changed");
  });

  return toggleBtn;
}

export function renderStickyRow(productId: string, readOnly: boolean): HTMLElement | null {
  const stickies = stickyService.byProduct(productId);
  if (readOnly && stickies.length === 0) return null;

  const mode = getStickyRowMode();

  const withToggle = stickies.length > 0;
  const block = el("div", { class: "sticky-block" }, withToggle ? [renderStickyToggle()] : []);

  const row = el("div", { class: `sticky-row sticky-row--${mode}` }, []);

  for (const sticky of stickies) {
    row.append(stickyCard(sticky, readOnly));
  }

  if (!readOnly) {
    const addBtn = el("button", {
      class: "btn btn--ghost sticky-row__add",
      type: "button",
      title: t("sticky.adicionarTitle")
    }, [
      icon("add"),
      el("span", { class: "sticky-row__add-label" }, [t("sticky.adicionar")])
    ]);
    addBtn.addEventListener("click", () => {
      stickyService.create({ productId });
    });
    row.append(addBtn);
  }

  block.append(row);

  return block;
}
