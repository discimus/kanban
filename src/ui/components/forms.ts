import { el, icon } from "./dom";
import { PALETTES, PaletteId } from "@shared/types";
import { t } from "@shared/i18n";

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

export interface PaletteSelector {
  element: HTMLElement;
  value: PaletteId;
}

export function paletteSelector(selected: PaletteId = "indigo"): PaletteSelector {
  const grid = el("div", { class: "palette-grid" }, []);
  const state = { value: selected };

  for (const p of PALETTES) {
    const isActive = p.id === selected;
    const btn = el("button", {
      class: `palette-swatch${isActive ? " palette-swatch--active" : ""}`,
      type: "button",
      title: t(`palette.${p.id}`),
      style: `--swatch: ${p.seed}`
    }, [
      isActive ? icon("check") : null
    ]);
    btn.addEventListener("click", () => {
      state.value = p.id;
      grid.querySelectorAll(".palette-swatch").forEach((b) => {
        b.classList.remove("palette-swatch--active");
        const check = b.querySelector(".material-symbols-outlined");
        if (check) check.remove();
      });
      btn.classList.add("palette-swatch--active");
      btn.append(icon("check"));
    });
    grid.append(btn);
  }

  return {
    element: grid,
    get value(): PaletteId { return state.value; }
  };
}
