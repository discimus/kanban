export type Attrs = Record<string, string | number | boolean | null | undefined>;

/**
 * Tiny hyperscript-style element factory used across the UI layer to
 * avoid a heavy framework while keeping DOM construction declarative.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string | null | undefined)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") {
      node.className = String(value);
    } else if (key === "dataset") {
      continue;
    } else if (key.startsWith("data-")) {
      node.setAttribute(key, String(value));
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Renders a Material Symbols (Outlined) icon. Decorative by default so it is
 * ignored by assistive tech; pair with adjacent text labels for meaning.
 */
export function icon(name: string, extraClass = ""): HTMLSpanElement {
  return el("span", { class: `material-symbols-outlined ${extraClass}`.trim(), "aria-hidden": "true" }, [name]);
}

export function on<K extends keyof HTMLElementEventMap>(
  node: HTMLElement,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void
): void {
  node.addEventListener(event, handler);
}

export interface MenuItem {
  label: string;
  icon: string;
  danger?: boolean;
  action: () => void;
}

/**
 * Overflow actions menu: a "more_vert" trigger that toggles a dropdown of
 * items. Closes on item click or when clicking outside the container.
 */
export function actionsMenu(items: MenuItem[]): HTMLElement {
  const trigger = el("button", { class: "actions-menu__trigger", "aria-label": "Mais ações" }, [icon("more_vert")]);

  const container = el("div", { class: "actions-menu" }, [trigger]);

  let outsideHandler: ((ev: Event) => void) | null = null;

  const closeMenu = (): void => {
    container.classList.remove("actions-menu--open");
    if (outsideHandler) {
      document.removeEventListener("click", outsideHandler);
      outsideHandler = null;
    }
  };

  const dropdown = el(
    "div",
    { class: "actions-menu__dropdown" },
    items.map((item) => {
      const btn = el("button", { class: `actions-menu__item${item.danger ? " actions-menu__item--danger" : ""}` }, [
        icon(item.icon),
        item.label
      ]);
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        closeMenu();
        item.action();
      });
      return btn;
    })
  );
  container.append(dropdown);

  trigger.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const isOpen = container.classList.toggle("actions-menu--open");
    if (isOpen) {
      outsideHandler = (e: Event) => {
        if (!container.contains(e.target as Node)) closeMenu();
      };
      setTimeout(() => document.addEventListener("click", outsideHandler!), 0);
    } else {
      closeMenu();
    }
  });

  return container;
}
