import { el } from "@ui/components/dom";
import { field, textInput, dateInput, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { releaseService } from "@contexts/release/application/release.service";
import { fromDateInputValue } from "@shared/utils";

export function openReleaseForm(productId: string): void {
  const name = textInput("", "Nome da release");
  const version = textInput("0.1.0", "Versão");
  const date = dateInput();
  const error = errorText();

  const submit = () => {
    try {
      releaseService.create({
        productId,
        name: name.value,
        version: version.value,
        releaseDate: fromDateInputValue(date.value)
      });
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field("Nome", name),
    el("div", { class: "form__row" }, [field("Versão", version), field("Data prevista", date)]),
    error,
    formActions("Criar release", submit)
  ]);

  openModal({ title: "Nova release", body });
}
