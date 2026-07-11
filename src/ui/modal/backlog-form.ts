import { el } from "@ui/components/dom";
import { field, textInput, textArea, numberInput, select, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { backlogService } from "@contexts/product/application/backlog.service";
import { releaseService } from "@contexts/release/application/release.service";
import { BacklogItem, Priority, PRIORITIES } from "@shared/types";

export function openBacklogForm(productId: string, existing?: BacklogItem): void {
  const title = textInput(existing?.title ?? "", "Título do item");
  const description = textArea(existing?.description ?? "", "Descrição");
  const priority = select(
    PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
    existing?.priority ?? "medium"
  );
  const points = numberInput(existing?.storyPoints ?? 0, 0);
  const error = errorText();

  const releaseOptions = [
    { value: "", label: "— Sem release —" },
    ...releaseService.byProduct(productId).map((r) => ({ value: r.id, label: `${r.name} (${r.version})` }))
  ];
  const releaseSel = select(releaseOptions, existing?.releaseId ?? "");

  const submit = () => {
    try {
      let item: BacklogItem;
      if (existing) {
        item = backlogService.edit(existing.id, {
          title: title.value,
          description: description.value,
          priority: priority.value as Priority,
          storyPoints: Number(points.value)
        });
      } else {
        item = backlogService.create({
          productId,
          title: title.value,
          description: description.value,
          priority: priority.value as Priority,
          storyPoints: Number(points.value)
        });
      }
      backlogService.assignRelease(item.id, releaseSel.value || null);
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field("Título", title),
    field("Descrição", description),
    el("div", { class: "form__row" }, [field("Prioridade", priority), field("Story Points", points)]),
    field("Release", releaseSel),
    error,
    formActions(existing ? "Salvar" : "Criar item", submit)
  ]);

  openModal({ title: existing ? "Editar item de backlog" : "Novo item de backlog", body });
}
