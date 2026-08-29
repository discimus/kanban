import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppState, GridTable } from "@shared/types";

const { state, mockStore, mockEventBus } = vi.hoisted(() => {
  const state: AppState = { products: [], backlogItems: [], tasks: [], links: [], comments: [], images: [], audios: [], estimations: [], gridTables: [] };
  return {
    state,
    mockStore: {
      getState: () => state,
      update: vi.fn((recipe: (s: AppState) => void) => { recipe(state); })
    },
    mockEventBus: {
      emit: vi.fn(),
      on: vi.fn()
    }
  };
});

vi.mock("@shared/storage", () => ({
  store: mockStore,
  reviveState: (r: unknown) => r,
  normalizeProduct: (p: unknown) => p,
  normalizeBacklogItem: (b: unknown) => b,
  normalizeLink: (l: unknown) => l,
  normalizeGridTable: (t: unknown) => t
}));
vi.mock("@shared/events", () => ({ eventBus: mockEventBus }));

import { gridService } from "@contexts/grid/application/grid.service";

function makeTable(overrides: Partial<GridTable> = {}): GridTable {
  return {
    id: "g1",
    backlogItemId: "b1",
    name: "Tabela",
    columns: [{ id: "c1", name: "Coluna 1" }],
    rows: [{ id: "r1", cells: {} }],
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides
  };
}

beforeEach(() => {
  state.products.length = 0;
  state.backlogItems.length = 0;
  state.tasks.length = 0;
  state.links.length = 0;
  state.comments.length = 0;
  state.images.length = 0;
  state.audios.length = 0;
  state.estimations.length = 0;
  state.gridTables!.length = 0;
  mockStore.update.mockClear();
  mockEventBus.emit.mockClear();
});

describe("gridService", () => {
  describe("create", () => {
    it("creates a table, saves it and emits grid:table-created", () => {
      const created = gridService.create({ backlogItemId: "b1", columnName: "Data" });
      expect(mockStore.update).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith("grid:table-created", created);
      expect(state.gridTables).toHaveLength(1);
      expect(state.gridTables![0].backlogItemId).toBe("b1");
      expect(state.gridTables![0].columns[0].name).toBe("Data");
    });
  });

  describe("mutations", () => {
    it("addRow saves and emits grid:table-updated", () => {
      state.gridTables = [makeTable()];
      const updated = gridService.addRow("g1");
      expect(updated.rows).toHaveLength(2);
      expect(mockEventBus.emit).toHaveBeenCalledWith("grid:table-updated", updated);
      expect(state.gridTables![0].rows).toHaveLength(2);
    });

    it("setCell writes the value", () => {
      state.gridTables = [makeTable()];
      const updated = gridService.setCell("g1", "r1", "c1", "Feito");
      expect(updated.rows[0].cells.c1).toBe("Feito");
      expect(state.gridTables![0].rows[0].cells.c1).toBe("Feito");
    });

    it("renameColumn updates the column name", () => {
      state.gridTables = [makeTable()];
      const updated = gridService.renameColumn("g1", "c1", "Prioridade");
      expect(updated.columns[0].name).toBe("Prioridade");
    });

    it("deleteColumn strips the column from rows", () => {
      state.gridTables = [makeTable({
        columns: [{ id: "c1", name: "Coluna 1" }, { id: "c2", name: "Coluna 2" }],
        rows: [{ id: "r1", cells: { c1: "x", c2: "y" } }]
      })];
      const updated = gridService.deleteColumn("g1", "c1");
      expect(updated.columns).toHaveLength(1);
      expect(updated.rows[0].cells.c1).toBeUndefined();
      expect(updated.rows[0].cells.c2).toBe("y");
    });

    it("deleteColumn allows removing the last column and strips its cells", () => {
      state.gridTables = [makeTable({ rows: [{ id: "r1", cells: { c1: "x" } }] })];
      const updated = gridService.deleteColumn("g1", "c1");
      expect(updated.columns).toEqual([]);
      expect(updated.rows[0].cells.c1).toBeUndefined();
      expect(state.gridTables![0].columns).toEqual([]);
    });

    it("deleteRow removes the row", () => {
      state.gridTables = [makeTable()];
      const updated = gridService.deleteRow("g1", "r1");
      expect(updated.rows).toHaveLength(0);
    });
  });

  describe("delete", () => {
    it("removes the table and emits grid:table-deleted", () => {
      state.gridTables = [makeTable()];
      gridService.delete("g1");
      expect(state.gridTables).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith("grid:table-deleted", { id: "g1" });
    });
  });

  describe("getForBacklogItem", () => {
    it("returns the table bound to the backlog item", () => {
      state.gridTables = [makeTable(), makeTable({ id: "g2", backlogItemId: "b2" })];
      expect(gridService.getForBacklogItem("b2")?.id).toBe("g2");
      expect(gridService.getForBacklogItem("missing")).toBeUndefined();
    });
  });

  describe("require", () => {
    it("throws when the table does not exist", () => {
      expect(() => gridService.addRow("ghost")).toThrow(Error);
    });
  });
});
