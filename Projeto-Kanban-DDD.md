# Projeto — Kanban Board (DDD + Bounded Contexts)

## Objetivo

Desenvolver uma SPA de gerenciamento ágil baseada em Scrum com persistência em `localStorage`.

### Funcionalidades

- Product
- Backlog Items
- Sprint
- Release
- Task
- Estimation Log
- Kanban com drag-and-drop

## Bounded Contexts

| Contexto | Responsabilidade |
|----------|------------------|
| Product Management | Produto e backlog |
| Sprint Planning | Planejamento de sprints |
| Release Planning | Planejamento de releases |
| Task Management | Gerenciamento de tarefas |
| Estimation | Histórico de estimativas |

## Estrutura

```text
src/
├── app/
├── shared/
│   ├── storage/
│   ├── events/
│   ├── utils/
│   └── types/
├── contexts/
│   ├── product/
│   ├── sprint/
│   ├── release/
│   ├── task/
│   └── estimation/
└── ui/
    ├── board/
    ├── modal/
    └── components/
```

## Entidades

### Product

- id
- name
- description
- createdAt

Relacionamentos:

- BacklogItems
- Releases
- Sprints

### BacklogItem

- id
- productId
- title
- description
- priority
- status
- storyPoints
- releaseId
- sprintId

### Task

- id
- backlogItemId
- title
- status
- assignedTo

### Sprint

- id
- productId
- name
- goal
- startDate
- endDate
- status

### Release

- id
- productId
- name
- version
- releaseDate
- status

### EstimationLog

- id
- taskId
- estimate
- createdAt
- comment

## Kanban

Colunas:

- Todo
- Doing
- Review
- Done

Cada card representa um Backlog Item.

## Casos de Uso

### Product

- Criar
- Editar
- Excluir

### Backlog

- Criar Item
- Editar
- Priorizar
- Mover entre colunas
- Associar Sprint
- Associar Release

### Sprint

- Criar
- Iniciar
- Encerrar
- Adicionar Backlog Item

### Release

- Criar
- Agendar Item
- Finalizar

### Task

- Criar
- Alterar Status
- Atribuir Responsável

### Estimation

- Registrar estimativa
- Consultar histórico

## Persistência

Salvar um único objeto no `localStorage`.

```json
{
  "products": [],
  "backlogItems": [],
  "tasks": [],
  "sprints": [],
  "releases": [],
  "estimations": []
}
```

## Arquitetura

Cada contexto segue:

```text
application/
domain/
infrastructure/
presentation/
```

## Fluxo

```text
Product
   │
   ▼
Backlog Item
 ├──► Release
 ├──► Sprint
 └──► Task
        │
        ▼
 Estimation Log
```

## MVP

1. Criar Products.
2. Criar Backlog Items.
3. Exibir Kanban.
4. Drag-and-drop.
5. Criar Tasks.
6. Criar Sprints.
7. Criar Releases.
8. Registrar estimativas.
9. Persistência automática via `localStorage`.
