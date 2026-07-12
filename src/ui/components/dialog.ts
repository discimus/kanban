import { el, clear } from "@ui/components/dom";

let overlay: HTMLDivElement | null = null;
let keyHandler: ((ev: KeyboardEvent) => void) | null = null;

function close(): void {
  if (!overlay) return;
  clear(overlay);
  overlay.remove();
  overlay = null;
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
}

interface DialogOptions {
  message: string;
  highlight?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onResolve: (value: boolean) => void;
}

function buildMessageParts(message: string, highlight?: string): (Node | HTMLElement)[] {
  if (!highlight) return [document.createTextNode(message)];
  const parts = message.split("{{text}}");
  const children: (Node | HTMLElement)[] = [];
  parts.forEach((part, i) => {
    if (part) children.push(document.createTextNode(part));
    if (i < parts.length - 1) {
      children.push(el("strong", { class: "dialog__highlight" }, [highlight]));
    }
  });
  return children;
}

function openDialog(options: DialogOptions): void {
  close();

  const resolveWith = (value: boolean): void => {
    close();
    options.onResolve(value);
  };

  const actions = el("div", { class: "dialog__actions" }, []);

  if (options.cancelLabel) {
    const cancelBtn = el("button", { class: "btn btn--sm", type: "button" }, [options.cancelLabel]);
    cancelBtn.addEventListener("click", () => resolveWith(false));
    actions.append(cancelBtn);
  }

  const confirmBtn = el("button", { class: "btn btn--primary btn--sm", type: "button" }, [options.confirmLabel]);
  confirmBtn.addEventListener("click", () => resolveWith(true));
  actions.append(confirmBtn);

  const dialog = el("div", { class: "dialog", role: "alertdialog", "aria-modal": "true" }, [
    el("p", { class: "dialog__message" }, buildMessageParts(options.message, options.highlight)),
    actions
  ]);

  overlay = el("div", { class: "dialog-overlay" }, [dialog]);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) resolveWith(false);
  });
  document.body.append(overlay);

  keyHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") resolveWith(false);
    else if (ev.key === "Enter") resolveWith(true);
  };
  document.addEventListener("keydown", keyHandler);

  confirmBtn.focus();
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    openDialog({ message, confirmLabel: "OK", onResolve: () => resolve() });
  });
}

export function showConfirm(message: string, highlight?: string): Promise<boolean> {
  return new Promise((resolve) => {
    openDialog({ message, highlight, confirmLabel: "Confirmar", cancelLabel: "Cancelar", onResolve: resolve });
  });
}

export function showOnboarding(): Promise<boolean> {
  return new Promise((resolve) => {
    openDialog({
      message: "Bem-vindo! Deseja carregar projetos de exemplo para explorar a aplicação?",
      confirmLabel: "Carregar projetos exemplo",
      cancelLabel: "Board em branco",
      onResolve: resolve
    });
  });
}
