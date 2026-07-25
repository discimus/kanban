import { eventBus } from "@shared/events";
import { pt } from "./pt";
import { en } from "./en";

const LOCALE_KEY = "kanban-locale";

const dictionaries: Record<string, Record<string, string>> = { pt, en };

let currentLocale: string = loadLocale();

function loadLocale(): string {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === "en") return "en";
    return "pt";
  } catch {
    return "pt";
  }
}

function saveLocale(locale: string): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch { /* ignore */ }
}

export function getLocale(): string {
  return currentLocale;
}

export function setLocale(locale: string): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  saveLocale(locale);
  eventBus.emit("state:changed");
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale] || dictionaries["pt"];
  let value = dict[key];
  if (value === undefined) {
    const ptValue = dictionaries["pt"][key];
    value = ptValue ?? key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
}

const enLabelMap: Record<string, string> = {
  development: "Development",
  business: "Business",
  study: "Study",
  notes: "Notes",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
  todo_kanban: "Todo",
  doing: "Doing",
  review: "Review",
  done: "Done",
  task: "Task",
  bug: "Bug",
  refactor: "Refactor",
  idea: "Idea",
  pending: "Pending",
  improvement: "Improvement",
  meeting: "Meeting",
  content: "Content",
  project: "Project",
  note: "Note",
  exercise: "Exercise",
  todo: "To-do",
  backlog: "Backlog",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

export function loc(item: { value: string; label: string }): string {
  if (currentLocale === "en") {
    return enLabelMap[item.value] ?? item.label;
  }
  return item.label;
}

export function localeDateString(date: Date): string {
  return date.toLocaleDateString(currentLocale === "en" ? "en-US" : "pt-BR");
}

export function localeDateTimeString(date: Date): string {
  const locale = currentLocale === "en" ? "en-US" : "pt-BR";
  return (
    date.toLocaleDateString(locale) +
    " " +
    date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  );
}
