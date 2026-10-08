# PDF import

Evaluation PDF → note (format: `specs/note-format.md`). Port of the `convert.py` script from the `jobtrek-eval-to-md` skill; keep the two in sync.

## Files
- `src/import/parser.ts`: pure, no Obsidian imports. `extractPdfText`, `parseEvaluation`, `categorize`, `buildNote`, `noteFileName`.
- `src/import/importer.ts`: `PdfImporter`, which talks to Obsidian (vault, notices, settings).

## Pipeline
1. `loadPdfJs()` (pdf.js bundled in Obsidian, 5.3.x; no extra dependency) → `extractPdfText`: text items are grouped into lines by y (±2pt), sorted by x, and pages are joined. This mimics `pdftotext` line order.
2. `parseEvaluation(text)` → `{ head, criteria, problems }`.
3. Not an evaluation (no criteria and no total line) → skipped: silently in auto mode, with a notice in manual mode.
4. `buildNote` → `<notesFolder or PDF folder>/<date|undated> <title>.md`. If the file exists → skip.

## PDF formats
| Template | Detected by | Criterion row |
|---|---|---|
| v1.4/1.5 (EN) | default | `5. Application Startup g5.1 2 3.5` → name, objectives, weight, grade (`NEW_ROW`, may span 3 lines) |
| v1.2 (FR) | text contains `Pondération` | title line `3 Name`, then `Pondération 3 Objectifs ICT évalués … Points obtenus 4.5` (`OLD_TITLE`, `OLD_WEIGHT`) |

- **Header:** `Project|Projet JT_DEV_x` (code); `Date YYYY-MM-DD` or `Date 16 June 2026` (EN/FR months); `Final grade|Note <grade> <points>/<max>`; title from `Evaluation[ de projet] - <title>`.
- **End of criteria:** `END_MARK`.
- **Comments:** `Comment:` / `To improve:`.
- **General comment:** `General comment and suggestions…` / `Commentaire général`.
- **New template:** extend the regexes at the top of `parser.ts`. Never hand-type tables.

## Categories
`RULES`: keyword lists checked against the lowercase criterion name, **first match wins, order matters**. If nothing matches → `unknown`.

## Check (`verify`)
- Σweight × 6 = max and Σ(weight × grade) = points, within ±0.01.
- At least one criterion was found.
- No `unknown` categories.

If the check fails, the note is still written with `check: failed` and a `> [!warning]` callout, plus a sticky notice.

## Triggers
| Trigger | Where | Mode |
|---|---|---|
| startup scan (after `onLayoutReady`) | `main.ts` → `scanFolder` | auto |
| settings change (folder/toggle), 1.5s debounce | `settings.ts` → `importer.rescan` | auto |
| new file in the PDF folder (`vault.create`, retried once after 3s) | `onFileCreated` | auto |
| command "import current PDF" | `main.ts` | manual |
| command "import all" / view header button | `importAll` | manual |
| file-menu item on `.pdf` | `main.ts` | manual |

- **Auto modes** require `autoImport` on and `pdfFolder` set.
- **Manual mode** shows a notice for every outcome and opens the note.
- **Dedup:** `isImported` (some note's `source` resolves to this PDF) plus the `importing` set (in flight).

## Settings (`src/settings.ts`)
- `pdfFolder`: watched recursively; empty = auto-import off.
- `notesFolder`: empty = next to the PDF.
- `autoImport`: on/off toggle.

## Limits
- Scanned PDFs (no text layer) are unsupported.
- `stack` is always `""` because it isn't in the PDF.

## Test outside Obsidian
Install `pdfjs-dist@5.3` in a temporary directory. Bundle `parser.ts` with `esbuild --format=esm`, then call `extractPdfText(pdfjs, buf)` → `parseEvaluation`. Every real evaluation must print `problems: []`.
