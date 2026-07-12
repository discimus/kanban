import { el, clear, icon } from "@ui/components/dom";

let overlay: HTMLDivElement | null = null;
let pendingOnClose: (() => void) | null = null;

export interface ModalOptions {
  title: string;
  body: HTMLElement;
  onClose?: () => void;
}

export function openModal(options: ModalOptions): void {
  closeModal();
  const closeBtn = el("button", { class: "modal__close", "aria-label": "Fechar" }, [icon("close")]);
  closeBtn.addEventListener("click", () => closeModal());

  const dialog = el("div", { class: "modal" }, [
    el("div", { class: "modal__header" }, [el("h2", { class: "modal__title" }, [options.title]), closeBtn]),
    el("div", { class: "modal__body" }, [options.body])
  ]);

  overlay = el("div", { class: "modal-overlay" }, [dialog]);
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeModal();
  });
  document.body.append(overlay);
  document.addEventListener("keydown", onEsc);
  pendingOnClose = options.onClose ?? null;

  const firstField = dialog.querySelector<HTMLElement>(".modal__body input, .modal__body textarea");
  firstField?.focus();
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
