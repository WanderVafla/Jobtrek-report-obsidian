# Changelog

All notable changes to this plugin. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions: [SemVer](https://semver.org/).

## [Unreleased]

### Changed
- Charts are 25% taller (trend 350px, categories and recurring 480px), so there is more room to read the lines.
- Points on the "What repeats from project to project" chart are ringed like the timeline dots, so each project is easier to spot.

### Fixed
- Two evaluations with the same project name no longer overwrite each other on the "What repeats from project to project" chart.
- Broken or unexpected values in the plugin settings file are replaced with defaults instead of breaking the settings.

## [1.1.0]

### Added
- **Import evaluation PDFs.** A Jobtrek evaluation PDF becomes a report note: criteria, weights, grades, categories, evaluator comments and the general comment.
- **Automatic import.** PDFs already in the chosen folder are imported when Obsidian starts, and new ones as soon as they appear (for example, through sync).
- **Manual import.** Import button in the report header, "Import as Jobtrek evaluation" in a PDF's right-click menu, and two commands (current PDF / all PDFs from the folder).
- **Settings.** PDF folder, notes folder (empty = next to the PDF), auto-import toggle.
- **No duplicates.** Each note remembers its source PDF, so a PDF is never imported twice.
- **Built-in check.** Imported grades must add up to the total in the PDF. Otherwise the note is marked with a warning.

### Changed
- Long project names on the chart axes wrap onto several lines instead of being tilted, which removes the empty space on the left.

### Fixed
- "What repeats from project to project" chart: lines no longer break when a criterion is missing from some evaluations. The missing stretch is drawn as a dashed line.

### Notes
- `stack` is not in the PDF; fill it in after importing.
- Scanned PDFs without a text layer can't be imported.

[Unreleased]: https://github.com/WanderVafla/Jobtrek-report-obsidian/compare/1.1.0...HEAD
[1.1.0]: https://github.com/WanderVafla/Jobtrek-report-obsidian/releases/tag/1.1.0
