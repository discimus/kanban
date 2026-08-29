import { describe, it, expect } from "vitest";
import {
  createGridTable,
  addGridColumn,
  renameGridColumn,
  deleteGridColumn,
  addGridRow,
  deleteGridRow,
  setGridCell
} from "@contexts/grid/domain/grid-table";

function baseTable() {
  const table = createGridTable({ backlogItemId: "b1" });
  return addGridRow(addGridColumn(table, "Status"));
}

describe("createGridTable", () => {
  it("creates a table bound to the backlog item with one column", () => {
    const t = createGridTable({ backlogItemId: "b1" });
    expect(t.backlogItemId).toBe("b1");
    expect(t.id).toBeTypeOf("string");
    expect(t.columns).toHaveLength(1);
    expect(t.columns[0].name).toBe("Coluna 1");
    expect(t.rows).toEqual([]);
    expect(t.createdAt).toBeTypeOf("string");
  });

  it("accepts custom column and table names", () => {
    const t = createGridTable({ backlogItemId: "b1", columnName: "Data", name: "Backlog" });
    expect(t.name).toBe("Backlog");
    expect(t.columns[0].name).toBe("Data");
  });

  it("throws when backlogItemId is empty", () => {
    expect(() => createGridTable({ backlogItemId: "" })).toThrow(Error);
  });
});

describe("addGridColumn", () => {
  it("appends a new column", () => {
    const t = addGridColumn(createGridTable({ backlogItemId: "b1" }), "Status");
    expect(t.columns).toHaveLength(2);
    expect(t.columns[1].name).toBe("Status");
  });

  it("throws when column name is blank", () => {
    expect(() => addGridColumn(createGridTable({ backlogItemId: "b1" }), "  ")).toThrow(Error);
  });
});

describe("renameGridColumn", () => {
  it("renames the column", () => {
    const t = createGridTable({ backlogItemId: "b1" });
    const renamed = renameGridColumn(t, t.columns[0].id, "Prioridade");
    expect(renamed.columns[0].name).toBe("Prioridade");
  });

  it("throws when new name is blank", () => {
    const t = createGridTable({ backlogItemId: "b1" });
    expect(() => renameGridColumn(t, t.columns[0].id, "")).toThrow(Error);
  });
});

describe("deleteGridColumn", () => {
  it("removes the column and strips its cells from rows", () => {
    let t = baseTable();
    const colId = t.columns[0].id;
    t = setGridCell(t, t.rows[0].id, colId, "valor");
    const result = deleteGridColumn(t, colId);
    expect(result.columns).toHaveLength(1);
    expect(result.rows[0].cells[colId]).toBeUndefined();
  });

  it("throws when deleting the last remaining column", () => {
    const t = createGridTable({ backlogItemId: "b1" });
    expect(() => deleteGridColumn(t, t.columns[0].id)).toThrow(Error);
  });
});

describe("addGridRow", () => {
  it("appends an empty row", () => {
    const t = addGridRow(createGridTable({ backlogItemId: "b1" }));
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].cells).toEqual({});
  });
});

describe("deleteGridRow", () => {
  it("removes the row", () => {
    const source = baseTable();
    const t = deleteGridRow(source, source.rows[0].id);
    expect(t.rows).toHaveLength(0);
  });
});

describe("setGridCell", () => {
  it("sets the value in the cell", () => {
    const t = baseTable();
    const colId = t.columns[0].id;
    const rowId = t.rows[0].id;
    const updated = setGridCell(t, rowId, colId, "Feito");
    expect(updated.rows[0].cells[colId]).toBe("Feito");
  });

  it("keeps other cells untouched", () => {
    let t = baseTable();
    const [c1, c2] = t.columns.map((c) => c.id);
    const rowId = t.rows[0].id;
    t = setGridCell(t, rowId, c1, "a");
    t = setGridCell(t, rowId, c2, "b");
    t = setGridCell(t, rowId, c1, "c");
    expect(t.rows[0].cells[c1]).toBe("c");
    expect(t.rows[0].cells[c2]).toBe("b");
  });

  it("throws when row is unknown", () => {
    const t = baseTable();
    expect(() => setGridCell(t, "ghost", t.columns[0].id, "x")).toThrow(Error);
  });

  it("throws when column is unknown", () => {
    const t = baseTable();
    expect(() => setGridCell(t, t.rows[0].id, "ghost", "x")).toThrow(Error);
  });
});
