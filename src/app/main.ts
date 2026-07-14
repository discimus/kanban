import { eventBus } from "@shared/events";
import { renderApp } from "./view";
import { applyTheme, getTheme } from "@ui/theme";
import { store } from "@shared/storage";
import { showConfirm, showOnboarding } from "@ui/components/dialog";
import { productService } from "@contexts/product/application/product.service";
import { runAutoArchive } from "@contexts/product/application/backlog.service";
import { showToast } from "@ui/components/notification";
import { createExampleData } from "@contexts/product/domain/example-data";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Elemento #app não encontrado.");
}

applyTheme(getTheme());
runAutoArchive();
renderApp(root);

eventBus.on("state:changed", () => {
  renderApp(root);
});

eventBus.on("backlog:archived", () => {
  showToast("Card arquivado", "archive");
});

eventBus.on("backlog:auto-archived", (count) => {
  showToast(`${count} ${Number(count) === 1 ? "card arquivado" : "cards arquivados"} automaticamente`, "archive");
});

eventBus.on("product:pending-completion", (productId) => {
  const product = productService.get(productId as string);
  if (!product) return;
  setTimeout(async () => {
    const ok = await showConfirm(
      'Todos os cards estão em "Done". Deseja concluir o projeto "{{text}}"?\n\nProjetos concluídos ficam em modo somente leitura.',
      product.name
    );
    if (ok) {
      productService.setStatus(productId as string, "completed");
    }
  }, 0);
});

const state = store.getState();
const isEmpty = state.products.length === 0 && state.backlogItems.length === 0 && state.tasks.length === 0 && state.links.length === 0 && state.estimations.length === 0;

if (isEmpty && localStorage.getItem("kanban-onboarding-done") !== "true") {
  setTimeout(async () => {
    const loadExamples = await showOnboarding();
    localStorage.setItem("kanban-onboarding-done", "true");
    if (loadExamples) {
      const data = createExampleData();
      store.update((s) => {
        s.products.push(...data.products);
        s.backlogItems.push(...data.backlogItems);
        s.tasks.push(...data.tasks);
        s.links.push(...data.links);
        s.estimations.push(...data.estimations);
      });
    }
  }, 200);
}
