# shared/AGENTS.md — Kernel compartilhado

## types/index.ts

**TODAS** as interfaces de entidade + `AppState` + constantes. Consulte **sempre** este arquivo primeiro.

- `AppState`: `{ products, backlogItems, tasks, links, comments, estimations }`
- Enums: `KanbanStatus`, `Priority`, `TaskClassification`, `TaskStatus`, `ProductStatus`, `ProductCategory`
- `emptyState()` — factory para estado vazio

## storage/index.ts

```typescript
class Store {
  getState(): AppState
  update(recipe: (state) => void): void  // muta + persiste + emite "state:changed"
  reset(): void
  replaceState(newState): void
}
```

**Migração**: funções `normalizeProduct`, `normalizeBacklogItem`, `normalizeLink` garantem compatibilidade com dados legados. Ao adicionar **campo obrigatório**, incluir fallback na `normalize*` correspondente.

## events/index.ts

- `DomainEvent` — union type de todos os eventos
- `eventBus` — singleton: `.on(name, fn)`, `.off(name, fn)`, `.emit(name, payload?)`
- Ao criar novo evento, **adicione ao union type**.

## utils/index.ts

- `uuid()` → ID único
- `nowISO()` → timestamp ISO
- `formatDate(iso)` → data formatada
- `formatRelativeDate(iso)` → relativo (ex: "há 2 dias")
