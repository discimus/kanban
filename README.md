# Kanban Board

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-22-339933.svg)](https://nodejs.org/)
[![Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://discimus.github.io/kanban/)

SPA de gerenciamento de tarefas em quadro Kanban, escrita em **TypeScript vanilla** (Vite 5), com **Domain-Driven Design** e bounded contexts isolados. Sem dependências de runtime, sem conta e sem servidor: os dados ficam no navegador.

> ℹ️ **Aviso:** esta aplicação foi desenvolvida com auxílio de IA (*vibecoding*).

**[Acessar demo](https://discimus.github.io/kanban/)**

## Sumário

- [Funcionalidades](#funcionalidades)
- [Glossário](#glossário)
- [Início rápido](#início-rápido)
- [Scripts](#scripts)
- [Atalhos de teclado](#atalhos-de-teclado)
- [Arquitetura](#arquitetura)
- [Persistência](#persistência)
- [Testes](#testes)
- [Contribuindo](#contribuindo)
- [Solução de problemas](#solução-de-problemas)
- [Limitações conhecidas](#limitações-conhecidas)
- [Licença](#licença)

## Funcionalidades

| Recurso                  | Descrição                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| Products (boards)        | Criar, editar e excluir projetos, por categoria e status                  |
| Backlog Items (cards)    | Cards com prioridade, classificação e estimativas                         |
| Kanban                   | Colunas **Todo · Doing · Review · Done** com drag-and-drop                |
| Tasks                    | Subtarefas (checklist) dentro de cada card                                |
| Links e comentários      | URLs e comentários vinculados ao card                                     |
| Grid tables              | Planilhas/tabelas dentro do card                                          |
| Mídia                    | Imagens e gravação de áudio nos cards                                     |
| Stickies                 | Notas adesivas no quadro                                                  |
| Estimativas              | Registro e histórico por card                                             |
| Exportar / importar      | JSON de todos os dados ou de um único Product, com detecção de conflitos  |
| Interface                | Temas claro/escuro, densidade ajustável, idiomas **pt** e **en**          |

## Glossário

Os nomes de interface e de código divergem em alguns pontos. Referência:

| Chave em `AppState` | Interface         | Significado na UI           |
|---------------------|-------------------|-----------------------------|
| `products`          | `Product`         | Projeto / Board             |
| `backlogItems`      | `BacklogItem`     | Tarefa (card do Kanban)     |
| `tasks`             | `Task`            | Subtarefa (checklist)       |
| `links`             | `Link`            | Link / URL                  |
| `comments`          | `Comment`         | Comentário                  |
| `estimations`       | `EstimationLog`   | Registro de estimativa      |
| `gridTables`        | `GridTable`       | Planilha/tabela no card     |
| `images`            | `Image`           | Imagem anexada              |
| `audios`            | `Audio`           | Áudio gravado               |
| `stickies`          | `Sticky`          | Nota adesiva                |

**Enums** (definidos em `src/shared/types/index.ts`)

| Enum                 | Valores                                                                                                     |
|----------------------|-------------------------------------------------------------------------------------------------------------|
| `KanbanStatus`       | `todo` · `doing` · `review` · `done`                                                                        |
| `Priority`           | `low` · `medium` · `high` · `critical`                                                                      |
| `TaskStatus`         | `todo` · `doing` · `done`                                                                                   |
| `ProductStatus`      | `backlog` · `in_progress` · `completed` · `canceled`                                                        |
| `ProductCategory`    | `development` · `business` · `study` · `notes`                                                              |
| `TaskClassification` | `task` · `bug` · `refactor` · `idea` · `pending` · `improvement` · `meeting` · `content` · `project` · `note` · `exercise` · `todo` |

## Início rápido

| Ferramenta | Versão                    |
|------------|---------------------------|
| Node.js    | 22 (versão usada no CI)   |
| npm        | 10+                       |

```bash
git clone https://github.com/discimus/kanban.git
cd kanban
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Scripts

| Comando              | Descrição                         |
|----------------------|-----------------------------------|
| `npm run dev`        | Servidor de desenvolvimento       |
| `npm run build`      | `tsc` + `vite build`              |
| `npm run preview`    | Serve o build localmente          |
| `npm run typecheck`  | `tsc --noEmit`                    |
| `npm run test`       | Executa a suíte (`vitest run`)    |
| `npm run test:watch` | Testes em modo watch              |

## Atalhos de teclado

| Atalho         | Ação                    |
|----------------|-------------------------|
| `N`            | Adição rápida           |
| `Shift + N`    | Nova tarefa / anotação  |
| `Ctrl + Enter` | Salvar formulário       |
| `Esc`          | Fechar                  |

## Arquitetura

Cada bounded context segue as camadas `domain/` (factories e funções puras), `application/` (services) e `infrastructure/` (repositories). A apresentação fica em `ui/`.

```
src/
├── app/                 # Bootstrap + view raiz
├── shared/              # Shared kernel
│   ├── types/           # Entidades, enums, AppState, emptyState()
│   ├── storage/         # Store, blob-store (IndexedDB), uso de armazenamento
│   ├── events/          # Event bus (DomainEvent)
│   ├── i18n/            # Dicionários pt e en
│   └── utils/           # uuid, datas
├── contexts/            # Bounded contexts
│   ├── product/         # Product, BacklogItem, exportação/importação
│   ├── task/            # Task
│   ├── link/            # Link
│   ├── comment/         # Comment
│   ├── estimation/      # EstimationLog
│   ├── grid/            # GridTable
│   ├── image/           # Imagens
│   ├── audio/           # Áudios
│   └── sticky/          # Stickies
└── ui/
    ├── board/           # Kanban, cards, stickies
    ├── modal/           # Formulários e detalhes
    ├── components/      # el(), dialog, forms, sidebar, estatísticas
    └── recorder/        # Gravação e reprodução de áudio
```

**Aliases de importação**

| Alias        | Caminho         |
|--------------|-----------------|
| `@app/*`     | `src/app/*`     |
| `@shared/*`  | `src/shared/*`  |
| `@contexts/*`| `src/contexts/*`|
| `@ui/*`      | `src/ui/*`      |

**Fluxo de dados**

1. A UI chama um *service* do contexto.
2. O *service* aplica regras de domínio e grava via *repository*.
3. O *repository* usa `Store.update()`, que muta o estado, persiste e emite `state:changed`.
4. A UI é re-renderizada.

**Cascade:** ao excluir um `BacklogItem`, são removidos `tasks`, `links`, `comments`, `estimations` e `gridTables` vinculados (`backlogItemId`), em `backlog.repository.ts`.

Detalhes por camada: [`src/shared/AGENTS.md`](src/shared/AGENTS.md), [`src/contexts/AGENTS.md`](src/contexts/AGENTS.md), [`src/ui/AGENTS.md`](src/ui/AGENTS.md).

## Persistência

| Dado                          | Mecanismo                | Chave / banco                                   |
|-------------------------------|--------------------------|-------------------------------------------------|
| Estado (`AppState`)           | `localStorage`           | `kanban-ddd-state` (apenas metadados)           |
| Imagens e áudios (blobs)      | IndexedDB                | banco `kanban-blobs`, store `blobs`             |
| Preferências                  | `localStorage`           | `kanban-ddd-theme`, `kanban-ddd-density`, `kanban-locale` |

- Blobs ficam fora do `localStorage` para evitar o limite de cota (~5–10 MB).
- Sem IndexedDB (ex.: modo privado), o app funciona, mas imagens e áudios são perdidos ao recarregar.
- Dados legados são migrados pelas funções `normalize*` em `shared/storage`.

> Os dados ficam apenas no navegador. Limpar os dados do site apaga o conteúdo. Use **Exportar** para backup.

## Testes

- Framework: Vitest (ambiente `node`), com `fake-indexeddb` para o blob store.
- Testes ficam ao lado do código (`*.test.ts`).

| Mudança             | Onde testar              |
|---------------------|--------------------------|
| Nova entidade       | Teste de domínio         |
| Novo método         | `*.service.test.ts`      |
| Novo campo          | `storage/index.test.ts`  |

## Contribuindo

Contribuições são bem-vindas. Regras principais (completas em [AGENTS.md](AGENTS.md)):

1. Abra uma *issue* descrevendo o bug ou a proposta.
2. Faça um *fork* e crie uma branch a partir de `main`.
3. **Não modifique testes existentes.** Se um teste quebrar, a mudança está errada. Exceção: `it.skip` com justificativa para falha externa.
4. **Adicione testes** para toda nova funcionalidade (tabela em [Testes](#testes)).
5. Ao final, execute obrigatoriamente:
   ```bash
   npm run build && npm run test
   ```
6. Abra um *pull request* com motivação e mudanças.

**Convenções por camada**

| Situação                  | Regra                                                                                  |
|---------------------------|----------------------------------------------------------------------------------------|
| Nova entidade             | `types` → `storage` (`reviveState`) → `events` → `domain` → `repository` → `service` → `export.service.ts` |
| Campo obrigatório novo    | Incluir fallback na função `normalize*` correspondente                                 |
| Novo evento               | Adicionar ao union type `DomainEvent`                                                  |
| Novo método em service    | Buscar, validar, salvar via repository e emitir evento                                 |
| DOM                       | Usar `el(tag, attrs, children)`                                                        |
| CSS                       | BEM (`.card__title`), variáveis MD3 (`--md-primary`), dark mode via `prefers-color-scheme` e `[data-theme="dark"]` |

## Solução de problemas

| Sintoma                              | Causa provável                       | Ação                                       |
|--------------------------------------|--------------------------------------|--------------------------------------------|
| Erro na instalação ou no build       | Versão incompatível do Node.js       | Usar Node.js 22 e npm 10+                  |
| Porta 5173 em uso                    | Outro processo ativo                 | Encerrar o processo ou liberar a porta     |
| Dados desapareceram                  | Dados do site limpos no navegador    | Restaurar via importação de JSON            |
| Imagens/áudios somem ao recarregar   | IndexedDB indisponível (modo privado)| Usar janela normal do navegador            |
| Dados diferem entre navegadores      | Armazenamento local por navegador    | Esperado; usar exportar/importar           |

## Limitações conhecidas

- Dados restritos ao navegador e ao perfil em uso.
- Sem autenticação, sincronização ou colaboração multiusuário.
- Imagens e áudios dependem de IndexedDB.

## Licença

Distribuído sob a licença [GPL-3.0](LICENSE).
