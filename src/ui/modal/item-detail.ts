import { el, clear } from "@ui/components/dom";
import { field, textInput, numberInput, select, formActions, errorText } from "@ui/components/forms";
import { openModal } from "../modal";
import { BacklogItem, Task, TaskStatus } from "@shared/types";
import { taskService } from "@contexts/task/application/task.service";
import { estimationService } from "@contexts/estimation/application/estimation.service";
import { formatDate } from "@shared/utils";

const TASK_STATUS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "A fazer" },
  { value: "doing", label: "Em andamento" },
  { value: "done", label: "Concluída" }
];

export function openItemDetail(item: BacklogItem): void {
  const container = el("div", { class: "detail" }, []);
  const render = () => {
    clear(container);
    container.append(buildNewTaskForm(item, render), buildTaskList(item, render));
  };
  render();
  openModal({ title: item.title, body: container });
}

function buildNewTaskForm(item: BacklogItem, rerender: () => void): HTMLElement {
  const title = textInput("", "Título da tarefa");
  const assignee = textInput("", "Responsável");
  const error = errorText();

  const submit = () => {
    try {
      taskService.create({ backlogItemId: item.id, title: title.value, assignedTo: assignee.value });
      rerender();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  return el("section", { class: "detail__section" }, [
    el("h3", {}, ["Nova tarefa"]),
    el("div", { class: "form__row" }, [field("Título", title), field("Responsável", assignee)]),
    error,
    formActions("Adicionar tarefa", submit)
  ]);
}

function buildTaskList(item: BacklogItem, rerender: () => void): HTMLElement {
  const tasks = taskService.byBacklogItem(item.id);
  const wrapper = el("section", { class: "detail__section" }, [el("h3", {}, [`Tarefas (${tasks.length})`])]);

  if (tasks.length === 0) {
    wrapper.append(el("p", { class: "muted" }, ["Nenhuma tarefa ainda."]));
    return wrapper;
  }

  for (const task of tasks) {
    wrapper.append(buildTaskRow(task, rerender));
  }
  return wrapper;
}

function buildTaskRow(task: Task, rerender: () => void): HTMLElement {
  const statusSel = select(
    TASK_STATUS.map((s) => ({ value: s.value, label: s.label })),
    task.status
  );
  statusSel.addEventListener("change", () => {
    taskService.changeStatus(task.id, statusSel.value as TaskStatus);
  });

  const assignee = textInput(task.assignedTo, "Responsável");
  assignee.addEventListener("change", () => {
    taskService.assign(task.id, assignee.value);
  });

  const del = el("button", { class: "btn btn--danger btn--sm" }, ["Excluir"]);
  del.addEventListener("click", () => {
    taskService.delete(task.id);
    rerender();
  });

  const estimateBtn = el("button", { class: "btn btn--ghost btn--sm" }, ["Estimativas"]);
  const estimatePanel = el("div", { class: "estimation" }, []);
  let open = false;
  estimateBtn.addEventListener("click", () => {
    open = !open;
    clear(estimatePanel);
    if (open) estimatePanel.append(buildEstimationPanel(task));
  });

  return el("div", { class: "task" }, [
    el("div", { class: "task__head" }, [
      el("span", { class: "task__title" }, [task.title]),
      statusSel,
      assignee,
      estimateBtn,
      del
    ]),
    estimatePanel
  ]);
}

function buildEstimationPanel(task: Task): HTMLElement {
  const panel = el("div", { class: "estimation__inner" }, []);

  const estimate = numberInput(0, 0);
  const comment = textInput("", "Comentário");
  const error = errorText();

  const historyBox = el("div", { class: "estimation__history" }, []);
  const renderHistory = () => {
    clear(historyBox);
    const history = estimationService.history(task.id);
    if (history.length === 0) {
      historyBox.append(el("p", { class: "muted" }, ["Sem estimativas registradas."]));
      return;
    }
    for (const h of history) {
      historyBox.append(
        el("div", { class: "estimation__row" }, [
          el("strong", {}, [`${h.estimate} pts`]),
          el("span", { class: "muted" }, [formatDate(h.createdAt)]),
          el("span", {}, [h.comment || "—"])
        ])
      );
    }
  };
  renderHistory();

  const submit = () => {
    try {
      estimationService.log({ taskId: task.id, estimate: Number(estimate.value), comment: comment.value });
      estimate.value = "0";
      comment.value = "";
      error.textContent = "";
      renderHistory();
    } catch (e) {
      error.textContent = (e as Error).message;
    }
  };

  panel.append(
    el("div", { class: "form__row" }, [field("Estimativa (pts)", estimate), field("Comentário", comment)]),
    error,
    formActions("Registrar estimativa", submit),
    el("h4", {}, ["Histórico"]),
    historyBox
  );
  return panel;
}
