# AGENTS.md

Obsidian plugin `Jobtrek Report`: timeline + Chart.js charts from vault notes with frontmatter `type: jobtrek-evaluation` and a `| Criterion | Weight | Grade | Category |` table.

- TypeScript, esbuild (bundle → `target/main.js`, copies `manifest.json` + `styles.css` to `target/`), pnpm, Chart.js. Obsidian API is external.
- UI languages RU/EN/FR (`i18n.ts`); toggle via `languages` action in view header.
- Build: `pnpm install && pnpm exec tsc --noEmit && pnpm run build`.
- Install: copy the contents of `target/` to `<vault>/.obsidian/plugins/jobtrek-report/`.
- File structure: see `STRUCTUR.md`.
