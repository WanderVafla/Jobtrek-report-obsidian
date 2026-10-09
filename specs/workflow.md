# Workflow

## Git
- **Branches:** a new branch from fresh `main` per task: `feat/…`, `fix/…`, `refactor/…`, `docs/…`. If a previous change is uncommitted, commit it on its own branch first.
- **Commits:** one commit per task. In multi-step work, one commit per step, and each step must build.
- **Messages:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `build:`, `chore:`).
- **Remote:** commit locally; push and open PRs only when asked. PRs are squash-merged into `main`.

## Versioning
- SemVer `MAJOR.MINOR.PATCH`: feature → minor, fix → patch; lower parts reset to 0.
- The version is bumped in **both** `manifest.json` and `package.json`, in a separate `chore: bump version to X.Y.Z` commit.
- GitHub release tag = exact `manifest.json` version, **without `v`** (Obsidian requires this).
- `CHANGELOG.md` is kept in parallel with development: every user-visible `feat`/`fix` adds a line under `[Unreleased]` in the same commit on its own branch. No separate changelog branches or catch-up commits. On release, rename `[Unreleased]` to the version and update the compare links at the bottom.

## Build and checks
```bash
pnpm install
pnpm exec tsc --noEmit   # must pass before every commit
pnpm run build           # → target/{main.js,manifest.json,styles.css}
```
- `.env` (git-ignored, template `.env.example`): `OBSIDIAN_VAULT=/path/to/vault` → the build also copies the plugin to `<vault>/.obsidian/plugins/jobtrek-report/`. `data.json` (user settings) is never touched.
- No test suite. Verify parser changes with the out-of-Obsidian harness (`specs/pdf-import.md`). UI changes need a manual check in Obsidian (reload the plugin).

## Code style
- Tabs, double quotes, Russian code comments (keep the existing style).
- Literals: technical ones go in `src/constants.ts`, UI text in `src/i18n.ts` with **all three languages** (ru, en, fr) filled.
- `src/import/parser.ts` stays pure (no `obsidian` import), so it can run in Node.
- Modules that need the plugin use `import type JobtrekReportPlugin from "../main"` to avoid runtime import cycles.
