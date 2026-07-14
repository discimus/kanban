# ui/AGENTS.md — Componentes e Estilo

## DOM (dom.ts)

`el(tag, attrs?, children?)` — fábrica hiperscript. Use para **todo** DOM.

```typescript
el("div", { class: "container" }, [
  el("h1", {}, ["Título"]),
  icon("delete"),
  condicao ? elemento : null
])
```

Helpers: `icon(name)` → `<span class="material-symbols-outlined">`, `clear(node)` → remove filhos, `actionsMenu(items)` → dropdown ⋮.

## Modal (modal.ts)

- `openModal({ title, body })` → modal com overlay
- `closeModal()` → fecha ativa

## Dialog (dialog.ts)

- `showAlert(msg): Promise<void>`
- `showConfirm(msg, highlight?): Promise<boolean>` — destaque via `{{text}}`

## Forms (forms.ts)

- `field(label, control)` → `<label class="field">`
- `textInput`, `textArea`, `numberInput`, `select`, `formActions`
- `errorText()` → `<p class="form__error">`

## CSS

- Variáveis MD3: `--md-primary`, `--md-surface`, `--text`, etc.
- Dark mode: `@media (prefers-color-scheme: dark)` + `[data-theme="dark"]`
- Nomenclatura BEM: `.card__title`, `.card__task--done`, `.chip--task`
- **Nunca** ler `styles.css` inteiro — use grep para classes específicas.
- Transições: `transition: background 0.15s, color 0.15s`
