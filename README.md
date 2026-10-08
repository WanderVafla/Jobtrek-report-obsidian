# Jobtrek Report — Obsidian plugin

Builds a report with a timeline and charts from your Jobtrek evaluation notes, in a separate tab.

Features:

- Timeline of all evaluations with grades and percentages.
- Three Chart.js charts: final grade trend, per-category averages, recurring weakest categories.
- Auto-refresh when notes change.
- Three UI languages (RU / EN / FR) with a `languages` button in the top-right of the view header. The choice is saved between restarts.

## Requirements

- Node.js LTS
- pnpm
- Obsidian ≥ 1.4.0 (see `manifest.json`)

## Manual build

```bash
pnpm install
pnpm exec tsc --noEmit   # type check
pnpm run build            # bundles main.ts → target/main.js, copies manifest.json + styles.css
```

Build output goes to `target/` (git-ignored): `main.js`, `manifest.json`, `styles.css`. Sources: `main.ts`, `constants.ts`, `i18n.ts`.

## Install into Obsidian

1. Build the project (see above).
2. Create the plugin folder in your vault:
   `<vault>/.obsidian/plugins/jobtrek-report/`
3. Copy the contents of `target/` into it (`main.js`, `manifest.json`, `styles.css`).
4. In Obsidian: Settings → Community plugins → Reload → enable **Jobtrek Report**.
5. Click the bar-chart icon in the left ribbon, or run the command **Open Jobtrek report**.

## Evaluation notes format

Each evaluation is one Markdown note with frontmatter `type: jobtrek-evaluation`
and a criteria table `| Criterion | Weight | Grade | Category |`:

```markdown
---
type: jobtrek-evaluation
project: shop-front
date: 2026-09-01
stack: React + TypeScript
note: First evaluation.
---

| Criterion | Weight | Grade | Category |
| --------- | ------ | ----- | -------- |
| README and docs | 1 | 3.5 | docs |
| Cart and checkout | 2 | 5.0 | core |
```

Frontmatter fields: `project`, `date` (`YYYY-MM-DD`), `stack`, `note`,
plus optional `grade` / `points` / `max`. If omitted, they are computed
from the table: `max = Σweight × 6`, `points = Σ(weight × grade)`,
`grade = points / max × 6`.

Category keys: `git`, `commits`, `docs`, `tooling`, `core`, `validation`,
`architecture`, `ui_ux`, `type_safety`, `security`, `spec`, `communication`.

Ready-made examples live in `sample-notes/` — copy them into your vault (any folder) to try the plugin.

## Switching language

Click the `languages` icon in the top-right of the report view header.
It cycles RU → EN → FR. Date format follows the language
(RU `DD.MM.YYYY`, FR `DD/MM/YYYY`, EN `YYYY-MM-DD`).

## Project structure

```text
jobtrek-report-source/
├── main.ts            # plugin + report view
├── constants.ts       # technical constants (view ids, CSS, Chart.js, events)
├── i18n.ts            # RU/EN/FR strings, date formatting
├── manifest.json      # Obsidian plugin manifest
├── styles.css         # report styles
├── esbuild.config.mjs # bundler config (output: target/ with main.js, manifest.json, styles.css)
├── sample-notes/      # example evaluation notes
└── target/            # build output (git-ignored)
```
