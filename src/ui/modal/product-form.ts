import { el, icon } from "@ui/components/dom";
import { field, textInput, textArea, select, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product, ProductStatus, ProductCategory, PRODUCT_STATUSES, PRODUCT_CATEGORIES } from "@shared/types";
import { openImportPicker, validateAndImport, checkImportConflicts } from "@contexts/product/application/export.service";
import { showAlert, showConfirm } from "@ui/components/dialog";

export function openProductForm(existing?: Product): void {
  const name = textInput(existing?.name ?? "", "Nome do Projeto");
  const description = textArea(existing?.description ?? "", "Descrição");
  const statusSel = select(
    PRODUCT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    existing?.status ?? "backlog"
  );
  const error = errorText();

  const catOptions = PRODUCT_CATEGORIES
    .filter((c) => existing || c.value !== "notes")
    .map((c) => ({ value: c.value, label: `${c.label}` }));
  const catSel = select(catOptions, existing?.category ?? "development");

  const AUTO_ARCHIVE_OPTIONS = [
    { value: "", label: "Nunca" },
    { value: "1", label: "1 dia" },
    { value: "3", label: "3 dias" },
    { value: "7", label: "7 dias" },
    { value: "14", label: "14 dias" },
    { value: "30", label: "30 dias" },
  ];

  const autoArchiveSel = select(
    AUTO_ARCHIVE_OPTIONS,
    existing?.autoArchiveDays ? String(existing.autoArchiveDays) : ""
  );

  const submit = () => {
    try {
      if (existing) {
        productService.edit(existing.id, {
          name: name.value,
          description: description.value,
          category: catSel.value as ProductCategory,
          autoArchiveDays: autoArchiveSel.value ? Number(autoArchiveSel.value) : null
        });
        if (statusSel.value !== existing.status) {
          productService.setStatus(existing.id, statusSel.value as ProductStatus);
        }
        closeModal();
      } else {
        const created = productService.create(name.value, description.value, catSel.value as ProductCategory);
        closeModal();
        import("../../app/view").then(({ forceSelectProduct }) => {
          forceSelectProduct(created.id, document.getElementById("app")!);
        });
      }
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field("Nome", name),
    field("Descrição", description),
    field("Categoria", catSel),
    existing ? field("Status", statusSel) : null,
    existing ? field("Arquivar automático", autoArchiveSel) : null,
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
        const { hasConflicts, conflicting } = checkImportConflicts(content);
        if (hasConflicts) {
          const names = conflicting.map(c => c.name);
          const msg = names.length === 1
            ? `O projeto "{{text}}" já existe. Deseja sobrescrevê-lo?`
            : `Os projetos "{{text}}" já existem. Deseja sobrescrevê-los?`;
          showConfirm(msg, names.join(", ")).then((ok) => {
            if (ok) {
              const result = validateAndImport(content, true);
              if (!result.success) showAlert(result.error!);
              else closeModal();
            }
          });
        } else {
          const result = validateAndImport(content);
          if (!result.success) showAlert(result.error!);
          else closeModal();
        }
      });
    });

    const separator = el("div", { class: "form__separator" }, [el("span", {}, ["ou"])]);
    body.append(createBtn, separator, importBtn);
  }

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: existing ? "Editar Projeto" : "Novo Projeto", body, autoFocus: !existing });
}
