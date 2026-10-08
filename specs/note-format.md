# Evaluation note format

Contract between import (`src/import/parser.ts: buildNote`) and report (`src/report/data.ts: loadEvaluations`). Change both sides together.

## Detection
A note counts as an evaluation iff frontmatter `type: jobtrek-evaluation` (`constants.FRONTMATTER_EVALUATION_TYPE`). Any folder.

## Frontmatter
| Field | Read by report | Fallback if missing |
|---|---|---|
| `type` | yes | (required) |
| `project` | yes | file basename |
| `date` | yes, `YYYY-MM-DD`, sort key | `""` (sorts first) |
| `stack` | yes, timeline chip | hidden |
| `grade` | yes, /6 | `points / max * 6` |
| `points` | yes | Σ(weight × grade) |
| `max` | yes | Σweight × 6 |
| `note` | yes, timeline subtitle | hidden |
| `code` | no (info, e.g. `JT_DEV_B51`) | — |
| `source` | importer only: `"[[path/to.pdf]]"`, dedup key | — |
| `check` | no; `failed` = import arithmetic check failed | — |

`grade` in the PDF is the evaluator's own number; copy it, never recompute it.

## Criteria table
- Any Markdown table row `| name | weight | grade | category |` (`data.ts: parseCriteria`).
- Header and separator rows are skipped because `weight`/`grade` don't parse as numbers. The header text is free (the importer writes it in Russian).
- Only the first 4 cells are used. `|` inside a name must become `/`.
- Lines not starting with `|` are ignored. Comments go below as bullets.

## Category keys
Fixed set: `parser.ts: CATEGORIES`. Labels: `i18n.ts: catLabels` (×3 languages). An unknown key shows up raw in the charts.

| key | scope |
|---|---|
| `git` | GitHub project board, issues, branches, PR workflow |
| `commits` | Conventional Commits |
| `docs` | README / documentation |
| `tooling` | build, lint, format, type-check pass/fail, deploy, Pint |
| `core` | main features: CRUD, persistence, DB schema, sort/filter, lifecycle |
| `validation` | input validation, error handling, guards, startup correctness |
| `architecture` | structure, DRY, dead code, state management, separation |
| `ui_ux` | visual design, responsive, a11y, HTML structure |
| `type_safety` | type quality (TS quality, PHP idioms); not "tsc passes" |
| `security` | SQLi, XSS, passwords/sessions, auth, front-end safety |
| `spec` | literal match with brief: required APIs, hooks, CLI flags |
| `communication` | oral / technical presentation |

Adding a key: add it to `CATEGORIES` (string array) and `RULES` in `parser.ts`, and to `catLabels` in `i18n.ts` for ru/en/fr. These are the only places that list categories; the charts read keys from the data.
Existing notes keep their old keys. Re-import skips PDFs that were already imported, so either edit the Category column by hand or delete the note and import again.

## Example
```markdown
---
type: jobtrek-evaluation
project: "PHP blog"
code: JT_DEV_B51
date: 2026-09-08
stack: ""
grade: 4.5
points: 129
max: 186
note: "First sentence of general comment."
source: "[[Apprentissage/Evaluation/JT_DEV_B51.pdf]]"
---
| Критерий | Вес | Оценка | Категория |
|---|---|---|---|
| Conventional Commits | 1 | 3.5 | commits |
```
