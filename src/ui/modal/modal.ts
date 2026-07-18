import { el, clear, icon } from "@ui/components/dom";

let overlay: HTMLDivElement | null = null;
let pendingOnClose: (() => void) | null = null;

export interface ModalOptions {
  title?: string;
  body: HTMLElement;
  onClose?: () => void;
  autoFocus?: boolean;
  noHeader?: boolean;
}

export function openModal(options: ModalOptions): void {
  closeModal();
  const closeBtn = el("button", { class: "modal__close", "aria-label": "Fechar" }, [icon("close")]);
  closeBtn.addEventListener("click", () => closeModal());

  const children: (Node | null)[] = [];
  if (options.noHeader) {
    children.push(closeBtn);
  } else {
    children.push(el("div", { class: "modal__header" }, [el("h2", { class: "modal__title" }, [options.title ?? ""]), closeBtn]));
  }
  children.push(el("div", { class: "modal__body" }, [options.body]));

  const dialog = el("div", { class: "modal" }, children);

  overlay = el("div", { class: "modal-overlay" }, [dialog]);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeModal();
  });
  document.body.append(overlay);
  document.addEventListener("keydown", onEsc);
  pendingOnClose = options.onClose ?? null;

  if (options.autoFocus !== false) {
    const firstField = dialog.querySelector<HTMLElement>(".modal__body input, .modal__body textarea");
    firstField?.focus();
  }
}

function onEsc(ev: KeyboardEvent): void {
  if (ev.key === "Escape") closeModal();
}

export function closeModal(): void {
  if (!overlay) return;
  clear(overlay);
  overlay.remove();
  overlay = null;
  document.removeEventListener("keydown", onEsc);
  if (pendingOnClose) {
    const cb = pendingOnClose;
    pendingOnClose = null;
    cb();
  }
}
