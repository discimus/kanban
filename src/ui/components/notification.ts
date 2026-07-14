import { el, icon } from "@ui/components/dom";

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!container) {
    container = el("div", { class: "notification-stack", role: "log", "aria-live": "polite" }, []);
    document.body.append(container);
  }
  return container;
}

export function showToast(message: string, iconName = "info", actionLabel?: string, action?: () => void): void {
  const toast = el("div", { class: "toast" }, [
    icon(iconName, "toast__icon"),
    el("span", { class: "toast__message" }, [message]),
    actionLabel ? el("button", { class: "toast__action", type: "button" }, [actionLabel]) : null,
    el("button", { class: "toast__close", type: "button" }, [icon("close")]),
  ]);

  if (action) {
    toast.querySelector(".toast__action")?.addEventListener("click", () => {
      dismiss(toast);
      action();
    });
  }

  toast.querySelector(".toast__close")!.addEventListener("click", () => dismiss(toast));

  getContainer().append(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  let dismissTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => dismiss(toast), 4000);

  toast.addEventListener("mouseenter", () => {
    if (dismissTimeout) clearTimeout(dismissTimeout);
    dismissTimeout = null;
  });

  toast.addEventListener("mouseleave", () => {
    if (!dismissTimeout) dismissTimeout = setTimeout(() => dismiss(toast), 2000);
  });
}

function dismiss(toast: HTMLElement): void {
  if (toast.classList.contains("toast--dismissing")) return;
  toast.classList.remove("toast--visible");
  toast.classList.add("toast--dismissing");
  toast.addEventListener("animationend", () => toast.remove());
}
