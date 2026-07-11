import { eventBus } from "@shared/events";
import { renderApp } from "./view";
import { applyTheme, getTheme } from "@ui/theme";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Elemento #app não encontrado.");
}

applyTheme(getTheme());
renderApp(root);

eventBus.on("state:changed", () => {
  renderApp(root);
});
