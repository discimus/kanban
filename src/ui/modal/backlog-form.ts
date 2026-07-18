import { el } from "@ui/components/dom";
import { field, textInput, textArea, numberInput, select, formActions, errorText } from "@ui/components/forms";
import { openModal, closeModal } from "../modal";
import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { taskService } from "@contexts/task/application/task.service";
import { linkService } from "@contexts/link/application/link.service";
import { commentService } from "@contexts/comment/application/comment.service";
import { BacklogItem, Priority, PRIORITIES, CATEGORY_CLASSIFICATIONS, TaskClassification } from "@shared/types";

export function openBacklogForm(productId: string, existing?: BacklogItem): void {
  const product = productService.get(productId);
  const category = product?.category ?? "development";
  const showMeta = category !== "notes";
  const isNotes = !showMeta;
  const clist = CATEGORY_CLASSIFICATIONS[category];

  const title = isNotes
    ? textArea(existing?.title ?? "", "Título da nota")
    : textInput(existing?.title ?? "", "Título do item");
  const description = textArea(existing?.description ?? "", "Descrição");
  const priority = showMeta
    ? select(PRIORITIES.map((p) => ({ value: p.value, label: p.label })), existing?.priority ?? "medium")
    : null;
  const points = showMeta
    ? numberInput(existing?.storyPoints ?? 0, 0)
    : null;
  const classification = select(
    clist.map((c) => ({ value: c.value, label: c.label })),
    existing?.classification ?? clist[0].value
  );
  const error = errorText();

  const subtaskInputs: { taskId: string; input: HTMLInputElement }[] = [];
  const subtasksSection = existing ? buildSubtasksSection(existing.id, subtaskInputs) : null;

  const linkInputs: { linkId: string; urlInput: HTMLInputElement }[] = [];
  const linksSection = existing ? buildLinksSection(existing.id, linkInputs) : null;

  const commentInputs: { commentId: string; original: string; input: HTMLInputElement }[] = [];
  const commentsSection = existing ? buildCommentsSection(existing.id, commentInputs) : null;

  const submit = () => {
    try {
      if (existing) {
        for (const { taskId, input } of subtaskInputs) {
          const value = input.value.trim();
          if (value) taskService.rename(taskId, value);
        }
        for (const { linkId, urlInput } of linkInputs) {
          const urlVal = urlInput.value.trim();
          if (urlVal) linkService.changeUrl(linkId, urlVal);
        }
        for (const { commentId, original, input } of commentInputs) {
          const value = input.value.trim();
          if (value && value !== original) commentService.edit(commentId, value);
        }
        backlogService.edit(existing.id, {
          title: title.value,
          description: description.value,
          priority: showMeta ? (priority!.value as Priority) : existing.priority,
          storyPoints: showMeta ? Number(points!.value) : existing.storyPoints,
          classification: classification.value as TaskClassification
        });
      } else {
        const createProps: Record<string, unknown> = {
          productId,
          title: title.value,
          description: description.value,
          classification: classification.value as TaskClassification
        };
        if (showMeta) {
          createProps.priority = priority!.value;
          createProps.storyPoints = Number(points!.value);
        }
        backlogService.create(createProps as any);
      }
      closeModal();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  const body = el("div", { class: "form" }, [
    field("Título", title),
    field("Descrição", description),
    showMeta ? el("div", { class: "form__row" }, [field("Prioridade", priority!), field("Story Points", points!)]) : null,
    field("Classificação", classification),
    subtasksSection,
    linksSection,
    commentsSection,
    error,
    formActions(existing ? "Salvar" : (isNotes ? "Criar nota" : "Criar item"), submit)
  ]);

  body.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });

  openModal({ title: existing ? (isNotes ? "Editar nota" : "Editar item de backlog") : (isNotes ? "Nova nota" : "Novo item de backlog"), body, autoFocus: !existing });

  if (existing && !existing.description) {
    description.focus();
  }
}

function buildSubtasksSection(
  backlogItemId: string,
  subtaskInputs: { taskId: string; input: HTMLInputElement }[]
): HTMLElement | null {
  const tasks = taskService.byBacklogItem(backlogItemId);
  if (tasks.length === 0) return null;

  const rows = tasks.map((task) => {
    const input = textInput(task.title, "Título da subtarefa");
    subtaskInputs.push({ taskId: task.id, input });
    return input;
  });

  return el("div", { class: "field" }, [
    el("span", { class: "field__label" }, ["Subtarefas"]),
    ...rows
  ]);
}

function buildLinksSection(
  backlogItemId: string,
  linkInputs: { linkId: string; urlInput: HTMLInputElement }[]
): HTMLElement | null {
  const links = linkService.byBacklogItem(backlogItemId);
  if (links.length === 0) return null;

  const rows: HTMLElement[] = [];
  for (const link of links) {
    const urlInput = textInput(link.url, "URL");
    linkInputs.push({ linkId: link.id, urlInput });
    rows.push(urlInput);
  }

  return el("div", { class: "field" }, [
    el("span", { class: "field__label" }, ["Links"]),
    ...rows
  ]);
}

function buildCommentsSection(
  backlogItemId: string,
  commentInputs: { commentId: string; original: string; input: HTMLInputElement }[]
): HTMLElement | null {
  const comments = commentService.byBacklogItem(backlogItemId);
  if (comments.length === 0) return null;

  const rows: HTMLElement[] = [];
  for (const c of comments) {
    const input = textInput(c.text, "Editar comentário");
    commentInputs.push({ commentId: c.id, original: c.text, input });
    rows.push(input);
  }

  return el("div", { class: "field" }, [
    el("span", { class: "field__label" }, ["Comentários"]),
    ...rows
  ]);
}
