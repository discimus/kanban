import { vi } from "vitest";
import { AppState, emptyState } from "@shared/types";

export function createMockStore(initialState?: Partial<AppState>) {
  const state = { ...emptyState(), ...initialState };
  return {
    getState: vi.fn(() => state),
    update: vi.fn((recipe: (s: AppState) => void) => { recipe(state); }),
    reset: vi.fn(() => { Object.assign(state, emptyState()); }),
    replaceState: vi.fn((newState: AppState) => { Object.assign(state, emptyState()); Object.assign(state, newState); })
  };
}

export function createMockEventBus() {
  const emitted: { event: string; payload?: unknown }[] = [];
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    emit: vi.fn((event: string, payload?: unknown) => { emitted.push({ event, payload }); }),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    }),
    emitted
  };
}
