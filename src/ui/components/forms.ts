import { el } from "./dom";

export function field(labelText: string, control: HTMLElement): HTMLElement {
  return el("label", { class: "field" }, [el("span", { class: "field__label" }, [labelText]), control]);
}

export function textInput(value = "", placeholder = ""): HTMLInputElement {
  const input = el("input", { class: "input", type: "text", value, placeholder }) as HTMLInputElement;
  input.value = value;
  return input;
}

export function numberInput(value = 0, min = 0): HTMLInputElement {
  const input = el("input", { class: "input", type: "number", min: String(min) }) as HTMLInputElement;
  input.value = String(value);
  return input;
}

export function dateInput(value = ""): HTMLInputElement {
  const input = el("input", { class: "input", type: "date" }) as HTMLInputElement;
  input.value = value;
  return input;
}

export function textArea(value = "", placeholder = ""): HTMLTextAreaElement {
  const area = el("textarea", { class: "input input--area", placeholder }) as HTMLTextAreaElement;
  area.value = value;
  return area;
}

export interface Option {
  value: string;
  label: string;
}

export function select(options: Option[], selected = ""): HTMLSelectElement {
  const sel = el("select", { class: "input" }) as HTMLSelectElement;
  for (const opt of options) {
    const optionEl = el("option", { value: opt.value }, [opt.label]) as HTMLOptionElement;
    if (opt.value === selected) optionEl.selected = true;
    sel.append(optionEl);
  }
  return sel;
}

export function formActions(submitLabel: string, onSubmit: () => void): HTMLElement {
  const submit = el("button", { class: "btn btn--primary", type: "button" }, [submitLabel]);
  submit.addEventListener("click", onSubmit);
  return el("div", { class: "form__actions" }, [submit]);
}

export function errorText(): HTMLParagraphElement {
  return el("p", { class: "form__error" }, []) as HTMLParagraphElement;
}
