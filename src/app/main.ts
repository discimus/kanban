import { eventBus } from "@shared/events";
import { renderApp } from "./view";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Elemento #app não encontrado.");
}

renderApp(root);

eventBus.on("state:changed", () => {
  renderApp(root);
});
