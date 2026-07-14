import { el, icon } from "@ui/components/dom";
import { KANBAN_COLUMNS, CATEGORY_CLASSIFICATIONS, PRIORITIES } from "@shared/types";
import { backlogService } from "@contexts/product/application/backlog.service";
import { productService } from "@contexts/product/application/product.service";
import { taskService } from "@contexts/task/application/task.service";

export function renderStatistics(productId: string): HTMLElement {
  const product = productService.get(productId);
  const category = product?.category ?? "development";
  const clist = CATEGORY_CLASSIFICATIONS[category];

  const items = backlogService.byProduct(productId);
  const total = items.length;
  const totalPoints = items.reduce((sum, i) => sum + i.storyPoints, 0);

  const allTasks = items.flatMap((bi) => taskService.byBacklogItem(bi.id));
  const doneTasks = allTasks.filter((t) => t.status === "done").length;
  const tasksPct = allTasks.length > 0 ? (doneTasks / allTasks.length) * 100 : 0;

  const doneCards = items.filter((i) => i.status === "done").length;
  const cardsPct = total > 0 ? (doneCards / total) * 100 : 0;

  const section = el("div", { class: "stats" }, []);

  // Visão Geral — KPIs
  section.append(el("h3", { class: "stats__title" }, ["Visão Geral"]));
  section.append(el("p", { class: "stats__desc" }, ["Métricas principais do projeto"]));
  section.append(
    el("div", { class: "stats__badges" }, [
      el("span", { class: "stats__badge" }, [`${total} cards`]),
      el("span", { class: "stats__badge" }, [`${totalPoints} pts`]),
      el("span", { class: "stats__badge" }, [`${allTasks.length} tasks`])
    ])
  );

  // Progresso — completion rates
  section.append(el("h3", { class: "stats__title" }, ["Progresso"]));
  section.append(el("p", { class: "stats__desc" }, ["Cards e tarefas concluídos"]));
  section.append(renderProgress("Cards concluídos", doneCards, total, cardsPct));
  section.append(renderProgress("Subtarefas concluídas", doneTasks, allTasks.length, tasksPct));

  // Fluxo de Trabalho — colunas kanban
  section.append(el("h3", { class: "stats__title" }, ["Fluxo de Trabalho"]));
  section.append(el("p", { class: "stats__desc" }, ["Cards em cada etapa do pipeline"]));

  for (const column of KANBAN_COLUMNS) {
    if (column.status === "review" && product?.showReview === false) continue;
    const colItems = items.filter((i) => i.status === column.status);
    const count = colItems.length;
    const points = colItems.reduce((s, i) => s + i.storyPoints, 0);
    const barPct = total > 0 ? Math.max(2, (count / total) * 100) : 0;

    const classSegments = clist.map((tc) => {
      const n = colItems.filter((i) => i.classification === tc.value).length;
      if (n === 0) return null;
      return el("div", { class: `stats__bar-seg stats__bar-seg--${tc.value}`, style: `flex:${n}` });
    }).filter(Boolean);

    section.append(
      el("div", { class: "stats__row" }, [
        el("span", { class: "stats__row-label" }, [column.label]),
        el("div", { class: "stats__bar" }, [
          el("div", { class: "stats__bar-fill", style: `width:${barPct}%` }, [
            classSegments.length > 0
              ? el("div", { class: "stats__bar-segments" }, classSegments as HTMLElement[])
              : null
          ])
        ]),
        el("span", { class: "stats__row-value" }, [count > 0 ? `${count} card${count !== 1 ? "s" : ""} · ${points} pts` : "—"])
      ])
    );
  }

  // Classificações — tipos de trabalho
  section.append(el("h3", { class: "stats__title" }, ["Classificações"]));
  section.append(el("p", { class: "stats__desc" }, ["Por tipo de trabalho"]));
  section.append(renderChips(clist, items, "classification"));

  // Prioridades — níveis de urgência
  section.append(el("h3", { class: "stats__title" }, ["Prioridades"]));
  section.append(el("p", { class: "stats__desc" }, ["Por nível de urgência"]));
  section.append(renderChips(PRIORITIES, items, "priority"));

  return section;
}

function renderProgress(label: string, done: number, total: number, pct: number): HTMLElement {
  return el("div", { class: "stats__progress" }, [
    el("span", { class: "stats__progress-label" }, [label]),
    el("div", { class: "stats__progress-bar" }, [
      el("div", { class: "stats__progress-fill", style: `width:${pct}%` })
    ]),
    el("span", { class: "stats__progress-text" }, [`${done}/${total} (${Math.round(pct)}%)`])
  ]);
}

function renderChips(
  source: { value: string; label: string; icon?: string }[],
  items: ReturnType<typeof backlogService.byProduct>,
  field: "classification" | "priority"
): HTMLElement {
  const row = el("div", { class: "stats__chips" }, []);

  for (const entry of source) {
    const count = items.filter((i) => (i as any)[field] === entry.value).length;
    const pct = items.length > 0 ? (count / items.length) * 100 : 0;

    row.append(
      el("span", { class: `chip chip--${entry.value}` }, [
        entry.icon ? icon(entry.icon) : null,
        el("span", {}, [`${entry.label}: ${count}`])
      ])
    );

    if (count > 0) {
      row.append(el("span", { class: "stats__chip-pct" }, [`${Math.round(pct)}%`]));
    }
  }

  return row;
}
