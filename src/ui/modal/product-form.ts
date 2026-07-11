import { el } from "@ui/components/dom";
import { field, textInput, textArea, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product } from "@shared/types";

export function openProductForm(existing?: Product): void {
  const name = textInput(existing?.name ?? "", "Nome do produto");
  const description = textArea(existing?.description ?? "", "Descrição");
  const error = errorText();

  const submit = () => {
    try {
      if (existing) {
        productService.edit(existing.id, { name: name.value, description: description.value });
      } else {
        productService.create(name.value, description.value);
      }
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field("Nome", name),
    field("Descrição", description),
    error,
    formActions(existing ? "Salvar" : "Criar produto", submit)
  ]);

  openModal({ title: existing ? "Editar produto" : "Novo produto", body });
}
