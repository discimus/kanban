import { GridTable } from "@shared/types";
import { store } from "@shared/storage";

export const gridRepository = {
  all(): GridTable[] {
    return store.getState().gridTables ?? [];
  },

  byBacklogItem(backlogItemId: string): GridTable[] {
    return this.all().filter((t) => t.backlogItemId === backlogItemId);
  },

  findByBacklogItem(backlogItemId: string): GridTable | undefined {
    return this.byBacklogItem(backlogItemId)[0];
  },

  findById(id: string): GridTable | undefined {
    return this.all().find((t) => t.id === id);
  },

  save(table: GridTable): void {
    store.update((s) => {
      const tables = s.gridTables ?? (s.gridTables = []);
      const idx = tables.findIndex((t) => t.id === table.id);
      if (idx >= 0) tables[idx] = table;
      else tables.push(table);
    });
  },

  remove(id: string): void {
    store.update((s) => {
      s.gridTables = (s.gridTables ?? []).filter((t) => t.id !== id);
    });
  }
};
