const FADE_SIZE = 36;

/**
 * Applies a vertical gradient mask to a scrollable container so its content
 * fades out at the top and bottom edges. The mask is removed when there is no
 * overflow (content fits) so the list reads as a flat surface.
 */
export function updateScrollFade(el: HTMLElement): void {
  const { scrollTop, scrollHeight, clientHeight } = el;

  if (scrollHeight <= clientHeight) {
    el.style.removeProperty("mask-image");
    el.style.removeProperty("-webkit-mask-image");
    return;
  }

  const topFade = scrollTop > 0 ? Math.min(scrollTop, FADE_SIZE) : 0;
  const bottomRemaining = scrollHeight - scrollTop - clientHeight;
  const bottomFade = bottomRemaining > 0 ? Math.min(bottomRemaining, FADE_SIZE) : 0;

  const mask = `linear-gradient(to bottom, transparent 0%, black ${topFade}px, black calc(100% - ${bottomFade}px), transparent 100%)`;
  el.style.maskImage = mask;
  el.style.webkitMaskImage = mask;
}

/**
 * Attaches the scroll listener that keeps the fade in sync and computes the
 * initial mask on the next frame. Recompute manually via `updateScrollFade`
 * after content changes without scrolling.
 */
export function setupScrollFade(el: HTMLElement): void {
  const handler = (): void => updateScrollFade(el);
  el.addEventListener("scroll", handler, { passive: true });
  requestAnimationFrame(() => handler());
}
