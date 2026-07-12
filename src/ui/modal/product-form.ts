import { el } from "@ui/components/dom";
import { field, textInput, textArea, select, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product, ProductStatus, PRODUCT_STATUSES } from "@shared/types";

export function openProductForm(existing?: Product): void {
  const name = textInput(existing?.name ?? "", "Nome do Projeto");
  const description = textArea(existing?.description ?? "", "Descrição");
  const statusSel = select(
    PRODUCT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    existing?.status ?? "backlog"
  );
  const error = errorText();

  const submit = () => {
    try {
      if (existing) {
        productService.edit(existing.id, { name: name.value, description: description.value });
        if (statusSel.value !== existing.status) {
          productService.setStatus(existing.id, statusSel.value as ProductStatus);
        }
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
    existing ? field("Status", statusSel) : null,
    error,
    formActions(existing ? "Salvar" : "Criar Projeto", submit)
  ]);

  openModal({ title: existing ? "Editar Projeto" : "Novo Projeto", body });
}
