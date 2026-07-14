# AGENTS.md — Kanban Board

SPA vanilla TS + DDD. Build: Vite 5, tsc strict. Persist: `localStorage` key `kanban-ddd-state`. Zero runtime deps.

## Comandos

| Comando | Ação |
|---|---|
| `npm run dev` | Dev server localhost:5173 |
| `npm run build` | tsc + vite build |
| `npm run typecheck` | tsc --noEmit |
| `npm run test` | vitest |

**SEMPRE** execute `npm run build && npm run test` ao finalizar uma implementação.

## Entidades vs Dados Persistidos

| AppState key | Interface | Significado |
|---|---|---|
| `products` | `Product` | Projeto / Board |
| `backlogItems` | `BacklogItem` | Tarefa (card do kanban) |
| `tasks` | `Task` | Subtarefa (checklist) |
| `links` | `Link` | Link / URL |
| `comments` | `Comment` | Comentário |
| `estimations` | `EstimationLog` | Registro de estimativa |

## Política de Testes

- **NUNCA** modificar testes existentes (se quebrar, a mudança está errada).
- **SEMPRE** adicionar testes para nova funcionalidade: entidade → domínio, método → service.test, campo → storage/index.test.
- Exceção: `it.skip` com justificativa para falha externa.

## Subpastas

| Arquivo | Propósito |
|---|---|
| `src/shared/AGENTS.md` | Types, Store, Events, Utils |
| `src/contexts/AGENTS.md` | Bounded contexts, padrões DDD |
| `src/ui/AGENTS.md` | el(), modal, dialog, CSS |
