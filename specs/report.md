# Report view

## Flow
`src/report/view.ts: ReportView.render`:
1. `data.ts: loadEvaluations(app)` → `Evaluation[]` sorted by `date`.
2. `theme.ts: readThemeColors` → `applyChartDefaults`.
3. Header, then timeline, then the 3 charts (`charts.ts`).
- **No evaluations:** an empty-state text.
- **Re-render triggers:** `metadataCache changed`, `vault delete`, `css-change` (600ms debounce), and a language switch.

## Bands (`src/report/bands.ts`)
| Function | Used for | bad | warn | good |
|---|---|---|---|---|
| `gradeBand(grade /6)` | timeline dot and badge, trend points | < 4.6 | < 5.15 | ≥ 5.15 |
| `scoreBand(category avg)` | category bars | < 4.3 | ≤ 4.8 | > 4.8 |

The thresholds live only in `bands.ts` and in the `i18n.ts: legendItems` texts (which describe `scoreBand`; FR uses decimal commas). Change them together.

## Aggregation (`data.ts: aggregate`)
- Category score = Σ(weight × grade) / Σweight.
- `ranked`: all categories over all evaluations, worst first.
- `perProject[i]`: category scores of `evals[i]`. It is indexed by evaluation, not by project name.
- `recurringCandidates`: categories present in ≥ 3 evaluations, the first 4 of `ranked`.

## Charts (`src/report/charts.ts`)
| # | Fn | Type | Data |
|---|---|---|---|
| 1 | `trendChart` | line | `points/max × 100` per evaluation, point color = `gradeBand`, y auto-range rounded to 5% |
| 2 | `categoriesChart` | horizontal bar | `ranked`, color = `scoreBand`, x 0–6 |
| 3 | `recurringChart` | multi-line | `recurringCandidates`, y 2–6. Missing category → `null`, bridged by a dashed line (`spanGaps` + `segment.borderDash`). Hidden if there are no candidates |

- X labels: project names wrapped by `wrapLabel` (`constants.AXIS_LABEL_WRAP_CHARS`) and not rotated. Rotated labels created empty space on the left.
- Colors: Obsidian CSS variables (`constants.CSS_VARS`) with `COLOR_FALLBACKS`. Palette for chart 3: bad, accent, warn, good.
- Box heights: `styles.css` `.jt-chart-box` (350px; `.tall` 480px).

## Header actions
In `view.ts: onOpen`: an import button (`importer.importAll`) and a language toggle (ru→en→fr, `i18n.ts: NEXT_LANG`, saved in settings). The tooltips must be updated in `refreshLanguage`.

## Styles
`styles.css`, all classes are prefixed `jt-` and named in `constants.CSS_CLASSES`. They use theme variables only, no hard-coded colors.
