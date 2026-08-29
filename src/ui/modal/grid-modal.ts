import { el, clear } from "@ui/components/dom";
import { openModal, closeModal } from "../modal";
import { gridService } from "@contexts/grid/application/grid.service";
import { renderGridTable } from "@ui/components/grid-table";
import { eventBus } from "@shared/events";
import { t } from "@shared/i18n";

export function openGridModal(backlogItemId: string, readOnly = false): void {
  const table = gridService.getForBacklogItem(backlogItemId);
  if (!table) return;

  const container = el("div", { class: "grid-modal" }, []);

  const render = (): void => {
    const current = gridService.getForBacklogItem(backlogItemId);
    if (!current) {
      closeModal();
      return;
    }
    clear(container);
    container.append(
      renderGridTable(current, {
        readOnly,
        maximized: true,
        scopeRoot: container
      })
    );
  };

  const unsubscribe = eventBus.on("state:changed", render);

  render();
  openModal({
    title: table.name || t("grid.tituloModal"),
    body: container,
    autoFocus: false,
    onClose: () => unsubscribe()
  });
  document.querySelector(".modal")?.classList.add("modal--grid");
}
