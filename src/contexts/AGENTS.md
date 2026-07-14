# contexts/AGENTS.md — Bounded Contexts

## Contextos atuais

| Contexto | Entidade | Arquivos |
|---|---|---|
| `product` | Product, BacklogItem | domain/, application/, infrastructure/ |
| `task` | Task | domain/, application/, infrastructure/ |
| `link` | Link | domain/, application/, infrastructure/ |
| `comment` | Comment | domain/, application/, infrastructure/ |
| `estimation` | EstimationLog | domain/, application/, infrastructure/ |

Cada contexto segue: `domain/` (factories + pure fns), `application/` (services), `infrastructure/` (repositories).

## Pattern: nova entidade

1. `types/index.ts` — interface + adicionar ao `AppState` + `emptyState`
2. `storage/index.ts` — adicionar ao `reviveState` (fallback `[]`)
3. `events/index.ts` — novos eventos no `DomainEvent`
4. `domain/{nome}.ts` — factory + validações
5. `infrastructure/{nome}.repository.ts` — CRUD via Store
6. `application/{nome}.service.ts` — lógica de aplicação
7. `export.service.ts` — validação + merge no `doImport`

## Pattern: novo método em service

```typescript
method(id: string, value: X): Entity {
  const existing = repository.findById(id);
  if (!existing) throw new Error("Não encontrado.");
  const updated = { ...existing, xpto: value };
  repository.save(updated);
  eventBus.emit("entity:updated", updated);
  return updated;
}
```

## Cascade

Ao deletar `BacklogItem` → remover `tasks`, `links`, `comments`, `estimations` vinculados (`backlogItemId`). Feito em `backlog.repository.ts`.
