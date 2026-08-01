import { el, icon } from "@ui/components/dom";
import { stickyService } from "@contexts/sticky/application/sticky.service";
import { stickyCard } from "./sticky-card";
import { t } from "@shared/i18n";

export function renderStickyRow(productId: string, readOnly: boolean): HTMLElement | null {
  const stickies = stickyService.byProduct(productId);
  if (readOnly && stickies.length === 0) return null;

  const row = el("div", { class: "sticky-row" }, []);

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

  return row;
}
