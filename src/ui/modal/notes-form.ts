import { el, icon } from "@ui/components/dom";
import { field, textInput, textArea, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";

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

  const body = el("div", { class: "form" }, [
    field("Nome", name),
    field("Descrição", description),
    error,
    createBtn
  ]);

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: "Nova board", body, autoFocus: true });
}
