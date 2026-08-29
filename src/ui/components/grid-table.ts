import { el, icon } from "@ui/components/dom";
import { GridTable, GridColumn, GridRow } from "@shared/types";
import { linkify } from "@shared/utils";
import { gridService } from "@contexts/grid/application/grid.service";
import { showConfirm, showAlert } from "@ui/components/dialog";
import { t } from "@shared/i18n";

export interface RenderGridOptions {
  readOnly: boolean;
  onExpand?: () => void;
  maximized?: boolean;
  /** Container estável que persiste entre re-renders (ex.: corpo do modal). */
  scopeRoot?: HTMLElement | null;
}

let instanceCounter = 0;

/**
 * Inline editable data grid (MD3 data-table semantics) bound to a GridTable.
 *
 * Edits are committed to the store on blur/Enter/Tab — never per keystroke —
 * because the app re-renders the whole board on every `store.update`. Buttons
 * suppress the native blur (mousedown) so a re-render cannot swallow the click;
 * pending cell edits are flushed before each structural action.
 */
export function renderGridTable(table: GridTable, opts: RenderGridOptions): HTMLElement {
  const instanceId = `grid-${++instanceCounter}`;
  const readOnly = opts.readOnly;

  const wrap = el("div", {
    class: `grid${opts.maximized ? " grid--maximized" : ""}${readOnly ? " grid--readonly" : ""}`,
    "data-grid-instance": instanceId,
    "data-grid-id": table.id,
    role: "region",
    "aria-label": table.name
  });

  const gridTable = el("table", { class: "grid__table" }, []);

  const flushPendingEdits = (): boolean => {
    const input = document.querySelector<HTMLInputElement>(".grid__input:focus, .grid__header-input:focus");
    if (!input) return false;
    const dirty = (input as unknown as { _dirty?: () => boolean })._dirty;
    if (dirty?.() !== true) return false;
    (input as unknown as { _commit?: () => void })._commit?.();
    return true;
  };

  const focusGridCell = (rowId: string, columnId: string): void => {
    const scope = opts.scopeRoot ?? document;
    const root = scope.querySelector<HTMLElement>(`[data-grid-id="${table.id}"]`);
    if (!root) return;
    const cell = root.querySelector<HTMLInputElement>(
      `.grid__input[data-grid-row="${rowId}"][data-grid-cell="${columnId}"]`
    );
    if (!cell) return;
    cell.focus();
    const len = cell.value.length;
    cell.setSelectionRange(len, len);
  };

  const flashNewColumn = (colId: string): void => {
    const scope = opts.scopeRoot ?? document;
    scope.querySelector<HTMLElement>(`th[data-grid-col="${colId}"]`)?.classList.add("grid__col--new");
    scope.querySelectorAll<HTMLInputElement>(`input[data-grid-cell="${colId}"]`).forEach((cell) => {
      cell.closest("td")?.classList.add("grid__cell--new");
    });
  };

  const flashNewRow = (rowId: string): void => {
    const scope = opts.scopeRoot ?? document;
    scope.querySelector<HTMLElement>(`tr[data-grid-row="${rowId}"]`)?.classList.add("grid__row--new");
  };

  const addColumn = (): void => {
    flushPendingEdits();
    const updated = gridService.addColumn(table.id, t("grid.novaColuna"));
    flashNewColumn(updated.columns[updated.columns.length - 1].id);
  };

  const addRow = (): void => {
    flushPendingEdits();
    const updated = gridService.addRow(table.id);
    flashNewRow(updated.rows[updated.rows.length - 1].id);
  };

  const moveTo = (rowId: string, columnId: string, dir: { row?: number; col?: number }): void => {
    let current = gridService.getForBacklogItem(table.backlogItemId) ?? table;
    let r = current.rows.findIndex((x) => x.id === rowId);
    let c = current.columns.findIndex((x) => x.id === columnId);
    if (r < 0) return;

    if (dir.row) {
      r += dir.row;
      if (r >= current.rows.length && dir.row > 0) {
        current = gridService.addRow(current.id);
        flashNewRow(current.rows[current.rows.length - 1].id);
        r = current.rows.length - 1;
      }
    }
    if (dir.col) {
      c += dir.col;
      if (c >= current.columns.length) {
        c = 0;
        r += 1;
        if (r >= current.rows.length) {
          current = gridService.addRow(current.id);
          flashNewRow(current.rows[current.rows.length - 1].id);
          r = current.rows.length - 1;
        }
      } else if (c < 0) {
        c = current.columns.length - 1;
        r -= 1;
        if (r < 0) {
          r = 0;
          c = 0;
        }
      }
    }

    if (r < 0 || r >= current.rows.length || c < 0 || c >= current.columns.length) return;
    const targetRow = current.rows[r];
    const targetCol = current.columns[c];
    requestAnimationFrame(() => focusGridCell(targetRow.id, targetCol.id));
  };

  const createCellEditor = (row: GridRow, column: GridColumn): HTMLElement => {
    const initial = row.cells[column.id] ?? "";
    if (readOnly) {
      return el("span", {
        class: "grid__value",
        "data-grid-row": row.id,
        "data-grid-cell": column.id,
        "aria-label": `${column.name}: ${initial}`
      }, linkify(initial).map((part) => {
        if (!part.url) return part.text;
        return el("a", {
          class: "grid__link",
          href: part.url,
          target: "_blank",
          rel: "noopener",
          title: part.url
        }, [part.text]);
      }));
    }

    const input = el("input", {
      class: "grid__input",
      type: "text",
      value: initial,
      "data-grid-row": row.id,
      "data-grid-cell": column.id,
      "aria-label": `${column.name}: ${initial}`
    }) as HTMLInputElement;

    let done = false;
    const commit = (): void => {
      if (done) return;
      done = true;
      const value = input.value;
      if (value === initial) return;
      gridService.setCell(table.id, row.id, column.id, value);
    };
    const dirty = (): boolean => input.value !== initial;

    (input as unknown as { _commit?: () => void; _dirty?: () => boolean })._commit = commit;
    (input as unknown as { _dirty?: () => boolean })._dirty = dirty;

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        done = true;
        input.value = initial;
        input.blur();
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        done = true;
        if (input.value !== initial) {
          gridService.setCell(table.id, row.id, column.id, input.value);
        }
        moveTo(row.id, column.id, { row: 1 });
      } else if (ev.key === "Tab") {
        ev.preventDefault();
        done = true;
        if (input.value !== initial) {
          gridService.setCell(table.id, row.id, column.id, input.value);
        }
        moveTo(row.id, column.id, { col: ev.shiftKey ? -1 : 1 });
      }
    });
    return input;
  };

  const startColumnRename = (column: GridColumn): void => {
    flushPendingEdits();
    const scope = opts.scopeRoot ?? document;
    const freshTh = scope.querySelector<HTMLElement>(`th[data-grid-col="${column.id}"]`);
    if (!freshTh) return;
    const label = freshTh.querySelector(".grid__col-label");
    const input = el("input", {
      class: "grid__header-input",
      type: "text",
      value: column.name,
      "data-grid-col": column.id,
      "aria-label": t("grid.renomear")
    }) as HTMLInputElement;
    label?.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const restore = (): void => {
      const th = scope.querySelector<HTMLElement>(`th[data-grid-col="${column.id}"]`);
      const current = th?.querySelector(".grid__header-input");
      const restored = el("button", { class: "grid__col-label", type: "button", title: column.name }, [column.name]);
      current?.replaceWith(restored);
    };
    const finish = (): void => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      if (value && value !== column.name) {
        gridService.renameColumn(table.id, column.id, value);
      } else {
        restore();
      }
    };
    const dirty = (): boolean => input.value.trim() !== column.name;
    (input as unknown as { _commit?: () => void; _dirty?: () => boolean })._commit = finish;
    (input as unknown as { _dirty?: () => boolean })._dirty = dirty;
    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        finish();
      } else if (ev.key === "Escape") {
        done = true;
        restore();
        input.blur();
      }
    });
  };

  const openColumnMenu = (anchor: HTMLElement, column: GridColumn): void => {
    document.querySelector(".grid__col-menu")?.remove();

    const makeItem = (label: string, iconName: string, danger: boolean, action: () => void): HTMLElement => {
      const btn = el("button", {
        class: `actions-menu__item${danger ? " actions-menu__item--danger" : ""}`,
        type: "button"
      }, [icon(iconName), el("span", { class: "actions-menu__label" }, [label])]);
      btn.addEventListener("mousedown", (ev) => ev.preventDefault());
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        popup.remove();
        action();
      });
      return btn;
    };

    const popup = el("div", { class: "actions-menu__dropdown grid__col-menu" }, [
      makeItem(t("grid.renomear"), "edit", false, () => startColumnRename(column)),
      makeItem(t("grid.excluirColuna"), "delete", true, () => {
        flushPendingEdits();
        showConfirm(t("grid.excluirColunaConfirm", { name: column.name }), column.name).then((ok) => {
          if (!ok) return;
          try {
            gridService.deleteColumn(table.id, column.id);
          } catch (e) {
            showAlert((e as Error).message);
          }
        });
      })
    ]);

    const rect = anchor.getBoundingClientRect();
    popup.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;z-index:300`;
    document.body.appendChild(popup);

    const close = (e: Event): void => {
      if (!popup.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
        popup.remove();
        document.removeEventListener("click", close);
        document.removeEventListener("scroll", close);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("scroll", close);
  };

  const renderColumnHeader = (column: GridColumn): HTMLElement => {
    const th = el("th", { class: "grid__cell grid__cell--header", scope: "col", "data-grid-col": column.id }, []);
    if (readOnly) {
      th.append(el("span", { class: "grid__col-label", title: column.name }, [column.name]));
      return th;
    }

    const label = el("button", { class: "grid__col-label", type: "button", title: column.name }, [column.name]);
    label.addEventListener("mousedown", (ev) => ev.preventDefault());
    label.addEventListener("click", () => startColumnRename(column));
    th.append(label);

    const trigger = el("button", {
      class: "actions-menu__trigger grid__col-menu-btn",
      type: "button",
      "aria-label": t("grid.opcoesColuna"),
      title: t("grid.opcoesColuna")
    }, [icon("more_vert")]);
    trigger.addEventListener("mousedown", (ev) => ev.preventDefault());
    trigger.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openColumnMenu(trigger, column);
    });
    th.append(trigger);
    return th;
  };

  const createAddColumnButton = (): HTMLElement => {
    const btn = el("button", {
      class: "grid__addcol",
      type: "button",
      "aria-label": t("grid.adicionarColuna"),
      title: t("grid.adicionarColuna")
    }, [icon("add")]);
    btn.addEventListener("mousedown", (ev) => ev.preventDefault());
    btn.addEventListener("click", addColumn);
    return btn;
  };

  const headerRow = el("tr", { class: "grid__row grid__row--header" }, []);
  for (const column of table.columns) headerRow.append(renderColumnHeader(column));

  if (!readOnly) {
    headerRow.append(el("th", { class: "grid__addcol-wrap", scope: "col" }, [createAddColumnButton()]));
  }

  gridTable.append(el("thead", {}, [headerRow]));

  const tbody = el("tbody", {}, []);

  if (table.columns.length === 0) {
    const emptyBtn = readOnly ? null : el("button", {
      class: "btn btn--tonal btn--sm grid__empty-btn",
      type: "button"
    }, [icon("add"), t("grid.adicionarColuna")]);
    if (emptyBtn) {
      emptyBtn.addEventListener("mousedown", (ev) => ev.preventDefault());
      emptyBtn.addEventListener("click", addColumn);
    }
    tbody.append(el("tr", { class: "grid__row grid__row--empty" }, [
      el("td", { class: "grid__empty-cell", colSpan: 1 }, [
        el("div", { class: "grid__empty" }, [
          el("span", { class: "grid__empty-text" }, [t("grid.semColunas")]),
          emptyBtn
        ])
      ])
    ]));
  } else {
    for (const row of table.rows) {
      const tr = el("tr", { class: "grid__row", "data-grid-row": row.id }, []);
      for (const column of table.columns) {
        tr.append(el("td", { class: "grid__cell" }, [createCellEditor(row, column)]));
      }
      if (!readOnly) {
        const del = el("button", {
          class: "grid__row-del",
          type: "button",
          "aria-label": t("grid.excluirLinha"),
          title: t("grid.excluirLinha")
        }, [icon("close")]);
        del.addEventListener("mousedown", (ev) => ev.preventDefault());
        del.addEventListener("click", () => {
          flushPendingEdits();
          showConfirm(t("grid.excluirLinhaConfirm")).then((ok) => {
            if (ok) gridService.deleteRow(table.id, row.id);
          });
        });
        tr.append(el("td", { class: "grid__cell grid__cell--rowdel" }, [del]));
      }
      tbody.append(tr);
    }
  }
  gridTable.append(tbody);

  wrap.append(el("div", { class: "grid__scroll" }, [gridTable]));

  const footer = el("div", { class: "grid__footer" }, []);
  if (!readOnly) {
    const addRowBtn = el("button", { class: "grid__add-row", type: "button" }, [icon("add"), t("grid.adicionarLinha")]);
    addRowBtn.addEventListener("mousedown", (ev) => ev.preventDefault());
    addRowBtn.addEventListener("click", addRow);
    footer.append(addRowBtn);
  }

  footer.append(el("span", { class: "grid__badge" }, [`${table.rows.length} × ${table.columns.length}`]));

  if (opts.onExpand) {
    const expand = el("button", {
      class: "grid__expand",
      type: "button",
      "aria-label": t("grid.abrirEditor"),
      title: t("grid.abrirEditor")
    }, [icon("table_view")]);
    expand.addEventListener("mousedown", (ev) => ev.preventDefault());
    expand.addEventListener("click", opts.onExpand);
    footer.append(expand);
  }
  wrap.append(footer);

  wrap.addEventListener("mousedown", (ev) => {
    const target = ev.target as HTMLElement;
    if (target.closest("button")) {
      ev.preventDefault();
      return;
    }
    const cellInput = target.closest<HTMLInputElement>(".grid__input");
    if (cellInput && document.activeElement !== cellInput) {
      const active = document.querySelector<HTMLInputElement>(".grid__input:focus, .grid__header-input:focus");
      const activeDirty = (active as unknown as { _dirty?: () => boolean } | null)?._dirty?.();
      if (activeDirty === true) {
        ev.preventDefault();
        flushPendingEdits();
        requestAnimationFrame(() => focusGridCell(cellInput.dataset.gridRow!, cellInput.dataset.gridCell!));
      }
    }
  });

  if (readOnly && opts.onExpand) {
    wrap.addEventListener("click", (ev) => {
      const target = ev.target as HTMLElement;
      if (target.closest("button") || target.closest("a")) return;
      opts.onExpand?.();
    });
  }

  return wrap;
}
