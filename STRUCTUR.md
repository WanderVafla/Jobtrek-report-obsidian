# STRUCTUR.md

```text
jobtrek-report-source/
├── main.ts            # plugin + report view (timeline, charts, language toggle)
├── constants.ts       # technical constants (view ids, CSS, Chart.js, events)
├── i18n.ts            # RU/EN/FR strings + date formatting
├── manifest.json      # Obsidian plugin manifest
├── styles.css         # report styles (jt-*)
├── esbuild.config.mjs # bundler config, output target/main.js
├── package.json       # deps + build script (pnpm)
├── tsconfig.json      # TS config
├── pnpm-lock.yaml     # locked deps
├── AGENTS.md          # agent guide (this project)
├── .gitignore         # ignores target/, node_modules/, main.js
└── target/            # build output (git-ignored)
```
