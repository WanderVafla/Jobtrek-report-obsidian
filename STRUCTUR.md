# STRUCTUR.md

```text
jobtrek-report-source/
├── src/
│   ├── main.ts            # plugin: lifecycle, ribbon, commands, file-menu, language switch
│   ├── settings.ts        # settings type, defaults, data.json normalization, settings tab
│   ├── constants.ts       # technical constants (view ids, CSS, Chart.js, events)
│   ├── i18n.ts            # RU/EN/FR strings + date formatting
│   ├── import/
│   │   ├── parser.ts      # evaluation PDF → note: pdf.js text, criteria parser, note builder
│   │   └── importer.ts    # PdfImporter: manual import, folder scan, vault.create watcher, dedup
│   └── report/
│       ├── view.ts        # ReportView: header actions, render (header, timeline, charts)
│       ├── data.ts        # evaluation notes → data, category aggregation
│       ├── charts.ts      # the three Chart.js charts
│       ├── theme.ts       # chart colors from Obsidian CSS variables
│       └── bands.ts       # grade thresholds (good / warn / bad)
├── manifest.json      # Obsidian plugin manifest
├── styles.css         # report styles (jt-*)
├── esbuild.config.mjs # bundler config, output target/ (main.js + manifest.json + styles.css); installs into $OBSIDIAN_VAULT
├── .env.example       # OBSIDIAN_VAULT template (copy to .env, git-ignored)
├── package.json       # deps + build script (pnpm)
├── tsconfig.json      # TS config
├── pnpm-lock.yaml     # locked deps
├── AGENTS.md          # agent guide (this project)
├── .gitignore         # ignores target/, node_modules/, main.js
└── target/            # build output (git-ignored)
```
