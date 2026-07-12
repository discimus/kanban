# AGENTS.md — Kanban Board

Este documento orienta agentes de IA sobre a estrutura, convenções e padrões do projeto. Ele é otimizado para reduzir consumo de tokens sem sacrificar clareza.

---

## Visão geral

- **Tipo**: SPA vanilla TypeScript (sem React/Vue/Angular)
- **Build**: Vite 5 + `tsc --noEmit` (strict)
- **Persistência**: `localStorage` (chave `kanban-ddd-state`)
- **UI**: hyperscript helper `el()` — sem virtual DOM
- **CSS**: variáveis MD3 com light/dark via `prefers-color-scheme`
- **Dependências runtime**: **zero**

## Como rodar

```bash
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build
npm run typecheck  # apenas tsc --noEmit
```

## Estrutura (DDD + Bounded Contexts)

```
src/
├── app/                    # main.ts (bootstrap) + view.ts (renderApp)
├── shared/                 # kernel compartilhado
│   ├── types/index.ts      # TODAS as entidades + AppState + constantes
│   ├── storage/index.ts    # Store (única fonte de verdade)
│   ├── events/index.ts     # EventBus tipado
│   └── utils/index.ts      # uuid(), nowISO(), formatDate()
├── contexts/
│   ├── product/            # Product + BacklogItem management
│   │   ├── domain/         # product.ts, backlog-item.ts (factories + validações)
│   │   ├── application/    # product.service.ts, backlog.service.ts, export.service.ts
│   │   └── infrastructure/ # repositories (wraps Store)
│   ├── task/               # Subtask management (Task entity)
│   ├── link/               # Link management (Link entity)
│   └── estimation/         # EstimationLog
└── ui/
    ├── board/              # board.ts (kanban + drag-drop), card.ts (renderização de cards)
    ├── modal/              # modal.ts, product-form.ts, backlog-form.ts
    └── components/         # dom.ts (el, icon, actionsMenu), forms.ts, dialog.ts, sidebar.ts, planning.ts, theme-menu.ts
```

## Fluxo de dados (pattern unidirecional)

```
UI click → service.method() → domain factory/pure fn → repository.add/save/remove()
         ↓
    repository chama store.update()
         ↓
    store persiste em localStorage + emite "state:changed"
         ↓
    eventBus.on("state:changed") dispara renderApp(root)
         ↓
    DOM inteiro é destruído e reconstruído do zero
```

## Tipos e constantes — sempre em `shared/types/index.ts`

### Entidades atuais
| Interface | Campos-chave |
|-----------|-------------|
| `Product` | id, name, description, createdAt, status, showPriority |
| `BacklogItem` | id, productId, title, description, priority, status, storyPoints, classification |
| `Task` | id, backlogItemId, title, status, assignedTo |
| `Link` | id, backlogItemId, url |
| `EstimationLog` | id, taskId, estimate, createdAt, comment |

### `AppState` — o que é persistido
```typescript
{ products, backlogItems, tasks, links, estimations }
```

### Tipos de enum
- `KanbanStatus`: "todo" | "doing" | "review" | "done"
- `Priority`: "low" | "medium" | "high" | "critical"
- `TaskClassification`: "task" | "bug" | "idea"
- `TaskStatus`: "todo" | "doing" | "done"
- `ProductStatus`: "backlog" | "in_progress" | "completed" | "canceled"

## Armazenamento (`shared/storage/index.ts`)

```typescript
class Store {
  getState(): AppState                           // leitura
  update(recipe: (state) => void): void           // mutação + persist + emit
  reset(): void                                   // limpa tudo
  replaceState(newState): void                    // substitui estado
}
```

- Métodos de migração `normalizeProduct`, `normalizeBacklogItem` garantem compatibilidade com dados antigos.
- Ao adicionar **novo campo obrigatório** em uma entidade, adicionar fallback na função `normalize*` correspondente.

## Eventos (`shared/events/index.ts`)

O `DomainEvent` é um union type. **Sempre que criar um novo evento, adicioná-lo ao union**. Eventos existentes:
`state:changed`, `product:created/updated/deleted`, `backlog:created/updated/moved/deleted`, `task:created/updated`, `link:created/updated/deleted`, `estimation:logged`

## Helpers principais

### `el(tag, attrs, children)` — `ui/components/dom.ts`
Fábrica de elementos hiperscript-style. Use para **toda** criação de DOM.
```typescript
el("div", { class: "container" }, [
  el("h1", {}, ["Título"]),
  icon("delete"),
  condicao ? algumElemento : null
])
```
- `icon(name)` → `<span class="material-symbols-outlined">name</span>`
- `clear(node)` → remove todos os filhos
- `actionsMenu(items: MenuItem[])` → dropdown de ações (⋮)

### `forms.ts`
- `field(label, control)` → `<label class="field">`
- `textInput(value, placeholder)`, `textArea(...)`, `numberInput(...)`, `select(options, selected)`
- `formActions(label, onSubmit)` → div com botão submit
- `errorText()` → `<p class="form__error">`

### `dialog.ts`
- `showAlert(message): Promise<void>` → modal de alerta
- `showConfirm(message, highlight?): Promise<boolean>` → modal de confirmação (highlight usa placeholder `{{text}}` no message)

### `modal.ts`
- `openModal({ title, body })` → modal com overlay
- `closeModal()` → fecha a modal ativa

## Padrão para adicionar nova funcionalidade

### Exemplo: novo método no service
```typescript
// 1. Adicionar em application/*.service.ts
setXpto(id: string, value: X): Entity {
  const existing = repository.findById(id);
  if (!existing) throw new Error("Não encontrado.");
  assertProductEditable(existing.productId);
  const updated = { ...existing, xpto: value };
  repository.save(updated);
  eventBus.emit("entity:updated", updated);
  return updated;
}
```

### Exemplo: nova entidade
```
1. types/index.ts — interface + adicionar ao AppState + emptyState
2. storage/index.ts — adicionar ao reviveState (com fallback [] para migration)
3. events/index.ts — registrar novos eventos no DomainEvent
4. contexts/{nome}/domain/{nome}.ts — factory + pure functions
5. contexts/{nome}/infrastructure/{nome}.repository.ts — CRUD via store
6. contexts/{nome}/application/{nome}.service.ts — lógica de aplicação
7. ui/ — renderização conforme necessário
8. export.service.ts — validação + merge no doImport
9. backlog.repository.ts — cleanup em cascata (remove da nova entidade ao deletar BacklogItem)
```

## CSS — variáveis e boas práticas

- Sempre usar variáveis MD3 (`--md-primary`, `--md-surface`, `--text`, etc.)
- Dark mode via `@media (prefers-color-scheme: dark)` e `[data-theme="dark"]`
- Transições: `transition: background 0.15s, color 0.15s`
- Nomenclatura BEM-like: `.card__title`, `.card__task--done`, `.chip--task`

## Redução de tokens para agentes

1. **Nunca ler `styles.css` inteiro** — use grep para encontrar classes específicas.
2. **Não re-ler arquivos já lidos** — o conteúdo persiste no contexto da conversa.
3. **Editar com `oldString` cirúrgico** — mínima quantidade de contexto ao redor.
4. **Prefira `edit` sobre `write`** — exceto para arquivos novos.
5. **Consulte `shared/types/index.ts` primeiro** — contém todas as interfaces, tipos e constantes.
6. **Siga o padrão existente** — copie a estrutura de um service/repository vizinho em vez de descrevê-la.
7. **`npm run typecheck`** é a única verificação necessária após mudanças (sem testes automatizados).
8. **Não crie documentação não solicitada** — o código é a documentação.
