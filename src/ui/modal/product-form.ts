import { el, icon } from "@ui/components/dom";
import { field, textInput, textArea, select, formActions, errorText, paletteSelector } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { productService } from "@contexts/product/application/product.service";
import { Product, ProductStatus, ProductCategory, PRODUCT_STATUSES, PRODUCT_CATEGORIES } from "@shared/types";
import { openImportPicker, validateAndImport, checkImportConflicts } from "@contexts/product/application/export.service";
import { showAlert, showConfirm } from "@ui/components/dialog";
import { t, loc } from "@shared/i18n";

export function openProductForm(existing?: Product): void {
  const name = textInput(existing?.name ?? "", t("form.nomeProjeto"));
  const description = textArea(existing?.description ?? "", t("form.descricao"));
  const statusSel = select(
    PRODUCT_STATUSES.map((s) => ({ value: s.value, label: loc(s) })),
    existing?.status ?? "backlog"
  );
  const error = errorText();

  const catOptions = PRODUCT_CATEGORIES
    .filter((c) => existing || c.value !== "notes")
    .map((c) => ({ value: c.value, label: loc(c) }));
  const catSel = select(catOptions, existing?.category ?? "development");

  const AUTO_ARCHIVE_OPTIONS = [
    { value: "", label: t("form.nunca") },
    { value: "1", label: t("form.umDia") },
    { value: "3", label: t("form.tresDias") },
    { value: "7", label: t("form.seteDias") },
    { value: "14", label: t("form.catorzeDias") },
    { value: "30", label: t("form.trintaDias") },
  ];

  const autoArchiveSel = select(
    AUTO_ARCHIVE_OPTIONS,
    existing?.autoArchiveDays ? String(existing.autoArchiveDays) : ""
  );

  const pal = paletteSelector(existing?.palette);

  const submit = () => {
    try {
      if (existing) {
        const isNotes = existing.category === "notes";
        productService.edit(existing.id, {
          name: name.value,
          description: description.value,
          category: catSel.value as ProductCategory,
          autoArchiveDays: isNotes ? null : (autoArchiveSel.value ? Number(autoArchiveSel.value) : null),
          palette: pal.value
        });
        if (!isNotes && statusSel.value !== existing.status) {
          productService.setStatus(existing.id, statusSel.value as ProductStatus);
        }
        closeModal();
      } else {
        const created = productService.create(name.value, description.value, catSel.value as ProductCategory, pal.value);
        closeModal();
        import("../../app/view").then(({ forceSelectProduct }) => {
          forceSelectProduct(created.id, document.getElementById("app")!);
        });
      }
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const isNotes = existing?.category === "notes";

  const body = el("div", { class: "form" }, [
    field(t("form.nome"), name),
    field(t("form.descricao"), description),
    field(t("form.categoria"), catSel),
    existing && !isNotes ? field(t("form.status"), statusSel) : null,
    existing && !isNotes ? el("label", { class: "field" }, [
      el("span", { class: "field__label" }, [t("form.arquivarAuto")]),
      autoArchiveSel,
      el("span", { class: "field__description" }, [t("form.arquivarAutoDesc")])
    ]) : null,
    el("label", { class: "field" }, [
      el("span", { class: "field__label" }, [t("palette.label")]),
      pal.element,
      el("span", { class: "field__description" }, [t("palette.desc")])
    ]),
    error
  ]);

  if (existing) {
    body.append(formActions(t("form.salvar"), submit));
  } else {
    const createBtn = el("button", { class: "btn btn--primary btn--block", type: "button" }, [t("form.criarProjeto")]);
    createBtn.addEventListener("click", submit);

    const importBtn = el("button", { class: "btn btn--ghost btn--block" }, [icon("upload"), t("form.importarDados")]);
    importBtn.addEventListener("click", () => {
      openImportPicker((content) => {
        const { hasConflicts, conflicting } = checkImportConflicts(content);
        if (hasConflicts) {
          const names = conflicting.map(c => c.name);
          const msg = names.length === 1
            ? t("form.importarConflitoUnico")
            : t("form.importarConflitoMultiplo");
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

    const separator = el("div", { class: "form__separator" }, [el("span", {}, [t("form.ou")])]);
    body.append(createBtn, separator, importBtn);
  }

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: existing ? t("form.editarProjeto") : t("form.novoProjeto"), body, autoFocus: !existing });
}
