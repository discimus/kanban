import { el, icon, actionsMenu } from "@ui/components/dom";
import { Product } from "@shared/types";
import { openBacklogForm } from "@ui/modal/backlog-form";
import { openProductForm } from "@ui/modal/product-form";
import { openProductSettings } from "@ui/modal/settings-modal";
import { productService } from "@contexts/product/application/product.service";
import { showAlert, showConfirm } from "@ui/components/dialog";
import { showToast } from "@ui/components/notification";
import { downloadExportProduct } from "@contexts/product/application/export.service";
import { t } from "@shared/i18n";

export function renderProductHeader(
  product: Product,
  showStats = false,
  onToggleStats?: () => void,
  hamburger?: HTMLElement,
  showArchived = false,
  onToggleArchived?: () => void,
  onArchive?: () => void
): HTMLElement {
  const isLocked = product.status === "completed" || product.status === "canceled" || !!product.archivedAt;

  const addLabel = product.category === "notes" ? t("planning.adicionarNota") : t("planning.adicionarTarefa");
  const addItem = el("button", { class: "btn btn--primary btn--sm" }, [icon("add"), addLabel]);
  addItem.addEventListener("click", () => {
    if (isLocked) {
      showAlert(t("planning.projetoLocked"));
      return;
    }
    openBacklogForm(product.id);
  });

  const statBtn = onToggleStats
    ? el("button", { class: `btn btn--sm${showStats ? " btn--primary" : ""}` }, [
        icon("bar_chart"),
        t("planning.estatisticas")
      ])
    : null;
  if (statBtn) {
    statBtn.addEventListener("click", onToggleStats!);
  }

  const archBtn = onToggleArchived
    ? el("button", { class: `btn btn--sm${showArchived ? " btn--primary" : ""}` }, [
        icon("archive"),
        t("planning.arquivadas")
      ])
    : null;
  if (archBtn) {
    archBtn.addEventListener("click", onToggleArchived!);
  }

  const settingsBtn = el("button", { class: "btn btn--sm btn--icon", "aria-label": t("planning.configuracoes") }, [icon("settings")]);
  settingsBtn.addEventListener("click", () => openProductSettings(product));

  const menu = actionsMenu([
    { label: t("planning.editar"), icon: "edit", action: () => openProductForm(product) },
    { label: t("planning.exportar"), icon: "download", action: () => downloadExportProduct(product.name, product.id) },
    {
      label: t("planning.copiarUrl"),
      icon: "link",
      action: () => {
        const url = `${window.location.origin}${window.location.pathname}?project=${product.id}`;
        navigator.clipboard.writeText(url).then(() => {
          showToast(t("planning.urlCopiada"), "link");
        });
      }
    },
    {
      label: product.archivedAt ? t("planning.restaurar") : t("planning.arquivar"),
      icon: product.archivedAt ? "unarchive" : "archive",
      action: onArchive ?? (() => {})
    },
    {
      label: t("planning.excluir"),
      icon: "delete",
      danger: true,
      action: () => {
        showConfirm(t("planning.excluirConfirm"), product.name).then((ok) => {
          if (ok) productService.delete(product.id);
        });
      }
    }
  ]);

  const topBar = el("div", { class: "content__topbar" }, [
    el("div", { class: "content__topbar-start" }, [hamburger]),
    el("h2", { class: "content__title" }, [product.name]),
    el("div", { class: "content__topbar-end" }, [
      el("div", { class: "content__actions" }, [addItem, statBtn, archBtn, settingsBtn].filter(Boolean) as HTMLElement[]),
      menu
    ])
  ]);

  return el("header", { class: "content__header" }, [
    topBar,
    el("p", { class: "content__subtitle" }, [product.description || t("planning.semDescricao")])
  ]);
}
