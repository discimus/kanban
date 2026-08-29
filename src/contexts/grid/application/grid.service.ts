import { GridTable } from "@shared/types";
import { eventBus } from "@shared/events";
import {
  createGridTable,
  CreateGridTableProps,
  addGridColumn,
  renameGridColumn,
  deleteGridColumn,
  addGridRow,
  deleteGridRow,
  setGridCell
} from "../domain/grid-table";
import { gridRepository } from "../infrastructure/grid.repository";

function commit(table: GridTable, event: "grid:table-created" | "grid:table-updated"): GridTable {
  gridRepository.save(table);
  eventBus.emit(event, table);
  return table;
}

export const gridService = {
  byBacklogItem(backlogItemId: string): GridTable[] {
    return gridRepository.byBacklogItem(backlogItemId);
  },

  getForBacklogItem(backlogItemId: string): GridTable | undefined {
    return gridRepository.findByBacklogItem(backlogItemId);
  },

  create(props: CreateGridTableProps): GridTable {
    const table = createGridTable(props);
    return commit(table, "grid:table-created");
  },

  addColumn(tableId: string, name: string): GridTable {
    return commit(addGridColumn(this.require(tableId), name), "grid:table-updated");
  },

  renameColumn(tableId: string, columnId: string, name: string): GridTable {
    return commit(renameGridColumn(this.require(tableId), columnId, name), "grid:table-updated");
  },

  deleteColumn(tableId: string, columnId: string): GridTable {
    return commit(deleteGridColumn(this.require(tableId), columnId), "grid:table-updated");
  },

  addRow(tableId: string): GridTable {
    return commit(addGridRow(this.require(tableId)), "grid:table-updated");
  },

  deleteRow(tableId: string, rowId: string): GridTable {
    return commit(deleteGridRow(this.require(tableId), rowId), "grid:table-updated");
  },

  setCell(tableId: string, rowId: string, columnId: string, value: string): GridTable {
    return commit(setGridCell(this.require(tableId), rowId, columnId, value), "grid:table-updated");
  },

  delete(tableId: string): void {
    gridRepository.remove(tableId);
    eventBus.emit("grid:table-deleted", { id: tableId });
  },

  require(tableId: string): GridTable {
    const table = gridRepository.findById(tableId);
    if (!table) throw new Error("Tabela não encontrada.");
    return table;
  }
};
