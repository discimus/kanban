import { el } from "@ui/components/dom";
import { field, textInput, textArea, numberInput, select, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { backlogService } from "@contexts/product/application/backlog.service";
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

  const submit = () => {
    try {
      if (existing) {
        backlogService.edit(existing.id, {
          title: title.value,
          description: description.value,
          priority: priority.value as Priority,
          storyPoints: Number(points.value)
        });
      } else {
        backlogService.create({
          productId,
          title: title.value,
          description: description.value,
          priority: priority.value as Priority,
          storyPoints: Number(points.value)
        });
      }
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field("Título", title),
    field("Descrição", description),
    el("div", { class: "form__row" }, [field("Prioridade", priority), field("Story Points", points)]),
    error,
    formActions(existing ? "Salvar" : "Criar item", submit)
  ]);

  openModal({ title: existing ? "Editar item de backlog" : "Novo item de backlog", body });
}
