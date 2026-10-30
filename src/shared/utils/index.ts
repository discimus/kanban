import { t, localeDateString } from "@shared/i18n";

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string | null): string {
  if (!iso) return t("utils.naoDisponivel");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t("utils.naoDisponivel");
  return localeDateString(d);
}

type RelativeUnit =
  | "agora"
  | "minuto"
  | "minutos"
  | "hora"
  | "horas"
  | "dia"
  | "dias"
  | "mes"
  | "meses"
  | "ano"
  | "anos";

interface RelativeParts {
  unit: RelativeUnit;
  n: number;
}

function relativeParts(iso: string | null): RelativeParts | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return null;
  if (diff < 0) return { unit: "agora", n: 0 };
  const seg = Math.floor(diff / 1000);
  if (seg < 60) return { unit: "agora", n: 0 };
  const min = Math.floor(seg / 60);
  if (min < 60) return { unit: min === 1 ? "minuto" : "minutos", n: min };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { unit: hr === 1 ? "hora" : "horas", n: hr };
  const dias = Math.floor(hr / 24);
  if (dias < 30) return { unit: dias === 1 ? "dia" : "dias", n: dias };
  const meses = Math.floor(dias / 30);
  if (meses < 12) return { unit: meses === 1 ? "mes" : "meses", n: meses };
  const anos = Math.floor(meses / 12);
  return { unit: anos === 1 ? "ano" : "anos", n: anos };
}

function unitSuffix(unit: RelativeUnit): string {
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

export function timeAgo(iso: string | null): string {
  const parts = relativeParts(iso);
  if (!parts) return "";
  if (parts.unit === "agora") return t("utils.visitadoAgora");
  return t(`utils.ha${unitSuffix(parts.unit)}`, { n: parts.n });
}

/** Relative completion label, e.g. "Concluído há 3 horas". Empty when unavailable. */
export function completedAgo(iso: string | null): string {
  const parts = relativeParts(iso);
  if (!parts) return "";
  if (parts.unit === "agora") return t("card.concluidoAgora");
  return t(`card.concluidoHa${unitSuffix(parts.unit)}`, { n: parts.n });
}

export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export interface LinkifiedPart {
  text: string;
  url?: string;
}

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

/** Remove pontuação final (.,;:!?"' e colchetes desbalanceados) de uma URL detectada. */
function trimUrlPunctuation(url: string): string {
  let s = url.replace(/[.,;:!?'"]+$/, "");
  while (s.length > 0) {
    const ch = s[s.length - 1];
    if (ch !== ")" && ch !== "]" && ch !== "}") break;
    const open = ch === ")" ? "(" : ch === "]" ? "[" : "{";
    const opens = (s.match(new RegExp("\\" + open, "g")) ?? []).length;
    const closes = (s.match(new RegExp("\\" + ch, "g")) ?? []).length;
    if (closes <= opens) break;
    s = s.slice(0, -1);
  }
  return s;
}

/**
 * Segmenta o texto em partes; cada parte pode ser texto comum ou uma URL
 * (`url` presente). A URL de saída normaliza `www.` para `https://www.` e
 * remove pontuação final. Nunca use para injetar HTML — o consumidor deve
 * montar o DOM com nós de texto/anchors (seguro contra XSS).
 */
export function linkify(text: string): LinkifiedPart[] {
  const parts: LinkifiedPart[] = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0];
    const trimmed = trimUrlPunctuation(raw);
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    if (trimmed.length > 0) {
      parts.push({
        text: trimmed,
        url: trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed
      });
    }
    last = m.index + trimmed.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
