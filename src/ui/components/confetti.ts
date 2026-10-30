const COLORS = ["var(--md-primary)", "var(--md-secondary)", "var(--md-tertiary)", "var(--md-error)"];

export interface ConfettiViewport {
  width: number;
  height: number;
}

export function confettiOrigin(
  rect: DOMRect,
  viewport: ConfettiViewport = { width: window.innerWidth, height: window.innerHeight }
): { x: number; y: number } | null {
  const left = Math.max(rect.left, 0);
  const top = Math.max(rect.top, 0);
  const right = Math.min(rect.right, viewport.width);
  const bottom = Math.min(rect.bottom, viewport.height);

  if (right <= left || bottom <= top) return null;

  return {
    x: left + (right - left) / 2,
    y: top + (bottom - top) / 2
  };
}

function createPiece(): HTMLElement {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = Math.round(6 + Math.random() * 6);

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  const shape = Math.floor(Math.random() * 3);
  let child: SVGElement;
  if (shape === 0) {
    child = document.createElementNS(ns, "circle");
    child.setAttribute("cx", String(size / 2));
    child.setAttribute("cy", String(size / 2));
    child.setAttribute("r", String(size / 2));
  } else if (shape === 1) {
    child = document.createElementNS(ns, "rect");
    child.setAttribute("width", String(size));
    child.setAttribute("height", String(size));
    child.setAttribute("rx", "1.5");
  } else {
    child = document.createElementNS(ns, "polygon");
    child.setAttribute("points", `${size / 2},0 ${size},${size} 0,${size}`);
  }
  child.style.fill = color;
  svg.append(child);

  const dx = (Math.random() - 0.5) * 220;
  const dy = (Math.random() - 0.5) * 200;
  const dr = Math.random() * 720 - 360;
  const delay = Math.random() * 0.25;
  const duration = 0.5 + Math.random() * 0.5;

  const wrapper = document.createElement("div");
  wrapper.className = "confetti__piece";
  wrapper.style.cssText = `--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--dr:${dr.toFixed(1)}deg;--delay:${delay.toFixed(2)}s;--duration:${duration.toFixed(2)}s`;
  wrapper.append(svg);

  return wrapper;
}

export function showConfetti(x: number, y: number): void {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const existing = document.querySelector(".confetti");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.className = "confetti";
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;

  for (let i = 0; i < 14; i++) {
    container.append(createPiece());
  }

  document.body.append(container);

  setTimeout(() => container.remove(), 1500);
}
