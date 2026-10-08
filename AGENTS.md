# AGENTS.md

Obsidian plugin "Jobtrek Report". It turns Jobtrek evaluation PDFs into notes and builds a report tab (timeline + 3 Chart.js charts) from those notes. Stack: TypeScript, esbuild, pnpm, Chart.js; the Obsidian API is external.

## Commands
```bash
pnpm install && pnpm exec tsc --noEmit && pnpm run build   # → target/, installs into $OBSIDIAN_VAULT if set (.env)
```

## Layout
```text
src/main.ts            plugin: ribbon, commands, file-menu, language, wiring
src/settings.ts        settings type, normalization, settings tab
src/constants.ts       technical literals (ids, events, CSS classes, Chart.js)
src/i18n.ts            UI text ru/en/fr, date format
src/import/parser.ts   PDF text → criteria → note markdown (pure)
src/import/importer.ts PdfImporter: triggers, dedup, writing notes
src/report/view.ts     ReportView: header actions, render
src/report/data.ts     notes → Evaluation[], aggregation
src/report/charts.ts   the 3 charts
src/report/{bands,theme}.ts  grade thresholds, theme colors
styles.css             jt-* classes
```

## Specs (read only the one you need)
- `specs/note-format.md`: evaluation note fields, criteria table, category keys. Read when touching data, categories or the importer output.
- `specs/pdf-import.md`: PDF formats, parsing, check, triggers, settings. Read when touching `src/import/*`.
- `specs/report.md`: render flow, bands, aggregation, charts. Read when touching `src/report/*` or `styles.css`.
- `specs/workflow.md`: git, versioning, build, code style. Read before committing.

## Rules
- UI text only via `i18n.ts`, in all 3 languages. Other literals go in `constants.ts`.
- Don't change behavior beyond the request.
- `pnpm exec tsc --noEmit` must pass before every commit.
- When code changes a contract, update the matching spec in the same commit.
