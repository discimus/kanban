import { GridTable, GridColumn, GridRow } from "@shared/types";
import { uuid, nowISO } from "@shared/utils";

export interface CreateGridTableProps {
  backlogItemId: string;
  columnName?: string;
  name?: string;
}

export function createGridTable(props: CreateGridTableProps): GridTable {
  if (!props.backlogItemId) throw new Error("A tabela precisa referenciar um card.");
  const column = createGridColumn(props.columnName ?? "Coluna 1");
  return {
    id: uuid(),
    backlogItemId: props.backlogItemId,
    name: props.name?.trim() || "Tabela",
    columns: [column],
    rows: [],
    createdAt: nowISO()
  };
}

export function createGridColumn(name: string): GridColumn {
  if (!name.trim()) throw new Error("A coluna precisa de um nome.");
  return { id: uuid(), name: name.trim() };
}

export function addGridColumn(table: GridTable, name: string): GridTable {
  return { ...table, columns: [...table.columns, createGridColumn(name)] };
}

export function renameGridColumn(table: GridTable, columnId: string, name: string): GridTable {
  if (!name.trim()) throw new Error("A coluna precisa de um nome.");
  return {
    ...table,
    columns: table.columns.map((c) => (c.id === columnId ? { ...c, name: name.trim() } : c))
  };
}

export function deleteGridColumn(table: GridTable, columnId: string): GridTable {
  return {
    ...table,
    columns: table.columns.filter((c) => c.id !== columnId),
    rows: table.rows.map((r) => {
      const cells = { ...r.cells };
      delete cells[columnId];
      return { ...r, cells };
    })
  };
}

export function addGridRow(table: GridTable): GridTable {
  const row: GridRow = { id: uuid(), cells: {} };
  return { ...table, rows: [...table.rows, row] };
}

export function deleteGridRow(table: GridTable, rowId: string): GridTable {
  return { ...table, rows: table.rows.filter((r) => r.id !== rowId) };
}

export function setGridCell(table: GridTable, rowId: string, columnId: string, value: string): GridTable {
  const existsRow = table.rows.some((r) => r.id === rowId);
  const existsColumn = table.columns.some((c) => c.id === columnId);
  if (!existsRow) throw new Error("Linha não encontrada.");
  if (!existsColumn) throw new Error("Coluna não encontrada.");
  return {
    ...table,
    rows: table.rows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: value } } : r
    )
  };
}
