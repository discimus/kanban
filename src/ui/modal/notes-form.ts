import { el, icon } from "@ui/components/dom";
import { field, textInput, textArea, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { openImportPicker, validateAndImport } from "@contexts/product/application/export.service";
import { showAlert } from "@ui/components/dialog";

export function openNotesForm(): void {
  const name = textInput("", "Nome da board");
  const description = textArea("", "Descrição");
  const error = errorText();

  const submit = () => {
    try {
      const created = productService.create(name.value, description.value, "notes");
      closeModal();
      import("../../app/view").then(({ forceSelectProduct }) => {
        forceSelectProduct(created.id, document.getElementById("app")!);
      });
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const createBtn = el("button", { class: "btn btn--primary btn--block", type: "button" }, [icon("note_stack_add"), "Criar board"]);
  createBtn.addEventListener("click", submit);

  const importBtn = el("button", { class: "btn btn--ghost btn--block" }, [icon("upload"), "Importar dados"]);
  importBtn.addEventListener("click", () => {
    openImportPicker((content) => {
      const result = validateAndImport(content);
      if (!result.success) {
        showAlert(result.error!);
      } else {
        closeModal();
      }
    });
  });

  const separator = el("div", { class: "form__separator" }, [el("span", {}, ["ou"])]);

  const body = el("div", { class: "form" }, [
    field("Nome", name),
    field("Descrição", description),
    error,
    createBtn,
    separator,
    importBtn
  ]);

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: "Nova board", body, autoFocus: true });
}
