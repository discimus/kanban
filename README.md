# Kanban Board — DDD + Bounded Contexts

ℹ️ Disclosure: This application was developed using AI (vibecoding).

SPA de gerenciamento ágil (Scrum) construída com **Vite + TypeScript**, sem frameworks de UI, seguindo **Domain-Driven Design** com bounded contexts isolados e persistência automática em `localStorage`.

## Stack

- Vite 5 + TypeScript (strict)
- DOM puro (hyperscript helper próprio) — sem dependências de runtime
- Persistência: um único objeto no `localStorage`

## Como rodar

```bash
npm install
npm run dev       # servidor de desenvolvimento (http://localhost:5173)
npm run build     # typecheck (tsc) + build de produção
npm run preview   # serve o build
npm run typecheck # apenas checagem de tipos
```

## Arquitetura

Cada bounded context segue as camadas `domain / application / infrastructure`, e a apresentação vive no diretório compartilhado `ui/`.

```text
src/
├── app/                 # bootstrap + view raiz (compõe a SPA)
├── shared/              # shared kernel
│   ├── types/           # entidades e AppState
│   ├── storage/         # Store único + persistência localStorage
│   ├── events/          # event bus de domínio
│   └── utils/           # ids, datas
├── contexts/
│   ├── product/         # Product Management (Product + BacklogItem)
│   ├── task/            # Task Management
│   └── estimation/      # Estimation (histórico)
└── ui/
    ├── board/           # Kanban + cards (drag-and-drop)
    ├── modal/           # formulários e detalhes
    └── components/      # DOM helpers, forms, sidebar, planning
```

## Bounded Contexts

| Contexto | Responsabilidade |
|----------|------------------|
| Product Management | Projeto e backlog |
| Task Management | Gerenciamento de tarefas |
| Estimation | Histórico de estimativas |

## Fluxo de dados

O `Store` (`shared/storage`) é a única fonte de verdade. Os *repositories* de cada contexto leem/escrevem nele; os *services* aplicam regras de domínio e emitem eventos. `state:changed` dispara a re-renderização e a persistência acontece automaticamente a cada mutação.

## Funcionalidades (MVP)

1. Criar / editar / excluir **Products**
2. Criar / editar / priorizar **Backlog Items**
3. **Kanban** com colunas Todo · Doing · Review · Done
4. **Drag-and-drop** entre colunas
5. Criar **Tasks** por item (status + responsável)
6. Registrar e consultar histórico de **estimativas**
7. Persistência automática via `localStorage`

## Licença

Este projeto está licenciado sob a **GNU General Public License v3.0** — veja o arquivo [LICENSE](LICENSE) para detalhes.
