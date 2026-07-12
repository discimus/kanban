import { el, icon } from "@ui/components/dom";
import { field, textInput, textArea, select, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product, ProductStatus, PRODUCT_STATUSES } from "@shared/types";
import { openImportPicker, validateAndImport } from "@contexts/product/application/export.service";
import { showAlert } from "@ui/components/dialog";

export function openProductForm(existing?: Product): void {
  const name = textInput(existing?.name ?? "", "Nome do Projeto");
  const description = textArea(existing?.description ?? "", "Descrição");
  const statusSel = select(
    PRODUCT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    existing?.status ?? "backlog"
  );
  const error = errorText();

  const showPriority = el("input", { class: "checkbox", type: "checkbox" }) as HTMLInputElement;
  if (existing) {
    showPriority.checked = existing.showPriority !== false;
  }

  const submit = () => {
    try {
      if (existing) {
        productService.edit(existing.id, { name: name.value, description: description.value, showPriority: showPriority.checked });
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
    existing ? el("label", { class: "field field--checkbox" }, [showPriority, el("span", { class: "field__label" }, ["Exibir prioridade das tarefas"])]) : null,
    error
  ]);

  if (existing) {
    body.append(formActions("Salvar", submit));
  } else {
    const createBtn = el("button", { class: "btn btn--primary btn--block", type: "button" }, ["Criar Projeto"]);
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
    body.append(createBtn, separator, importBtn);
  }

  openModal({ title: existing ? "Editar Projeto" : "Novo Projeto", body });
}
