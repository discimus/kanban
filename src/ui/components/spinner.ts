import { el } from "@ui/components/dom";

/**
 * MD3-style indeterminate circular progress indicator. Uses a rotating ring
 * (CSS animation) so it renders anywhere without extra dependencies. The
 * animation is disabled under `prefers-reduced-motion`.
 */
export function spinner(extraClass = "", ariaLabel = ""): HTMLSpanElement {
  return el("span", {
    class: `spinner ${extraClass}`.trim(),
    role: "progressbar",
    "aria-label": ariaLabel || undefined
  });
}
