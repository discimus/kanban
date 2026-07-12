import { eventBus } from "@shared/events";
import { renderApp } from "./view";
import { applyTheme, getTheme } from "@ui/theme";
import { store } from "@shared/storage";
import { showOnboarding } from "@ui/components/dialog";
import { createExampleData } from "@contexts/product/domain/example-data";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Elemento #app não encontrado.");
}

applyTheme(getTheme());
renderApp(root);

eventBus.on("state:changed", () => {
  renderApp(root);
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
