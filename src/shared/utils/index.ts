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

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return t("utils.visitadoAgora");
  const seg = Math.floor(diff / 1000);
  if (seg < 60) return t("utils.visitadoAgora");
  const min = Math.floor(seg / 60);
  if (min < 60) return t(min === 1 ? "utils.haMinuto" : "utils.haMinutos", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t(hr === 1 ? "utils.haHora" : "utils.haHoras", { n: hr });
  const dias = Math.floor(hr / 24);
  if (dias < 30) return t(dias === 1 ? "utils.haDia" : "utils.haDias", { n: dias });
  const meses = Math.floor(dias / 30);
  if (meses < 12) return t(meses === 1 ? "utils.haMes" : "utils.haMeses", { n: meses });
  const anos = Math.floor(meses / 12);
  return t(anos === 1 ? "utils.haAno" : "utils.haAnos", { n: anos });
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
