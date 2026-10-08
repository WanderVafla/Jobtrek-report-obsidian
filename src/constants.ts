// Технические константы: id, иконки, события, CSS, Chart.js, форматирование.
// Тексты интерфейса живут в i18n.ts; пороги оценок (4.6, 5.15, ...) в report/bands.ts.

export const VIEW_TYPE = "jobtrek-report-view";

export const RIBBON_ICON = "bar-chart-3";

export const COMMAND_ID = "open-jobtrek-report";

export const NEW_TAB_LEAF_TYPE = "tab";

export const LANG_ACTION_ICON = "languages";

export const VIEW_ICON = "bar-chart-3";

export const EVENT_METADATA_CHANGED = "changed";
export const EVENT_VAULT_DELETE = "delete";
export const EVENT_CSS_CHANGE = "css-change";
export const EVENT_VAULT_CREATE = "create";
export const EVENT_FILE_MENU = "file-menu";

/** Импорт PDF-оценок. */
export const COMMAND_IMPORT_PDF_ID = "import-jobtrek-pdf";
export const COMMAND_IMPORT_ALL_ID = "import-all-jobtrek-pdfs";
export const PDF_EXTENSION = "pdf";
export const IMPORT_ICON = "file-input";
export const IMPORT_RETRY_MS = 3000;
export const RESCAN_DEBOUNCE_MS = 1500;
export const PDF_FOLDER_PLACEHOLDER = "Apprentissage/Evaluation";

/** Значение frontmatter `type`, по которому находим оценки. */
export const FRONTMATTER_EVALUATION_TYPE = "jobtrek-evaluation";

/** CSS-классы разметки отчёта. */
export const CSS_CLASSES = {
	report: "jt-report",
	muted: "jt-muted",
	head: "jt-head",
	timeline: "jt-timeline",
	timelineItem: "jt-tl-item",
	timelineDot: "jt-tl-dot",
	timelineHead: "jt-tl-head",
	timelineDate: "jt-tl-date",
	timelineTitle: "jt-tl-title",
	timelineStack: "jt-tl-stack",
	timelineGrade: "jt-tl-grade",
	timelineNote: "jt-tl-note",
	chartBox: "jt-chart-box",
	chartBoxTall: "jt-chart-box tall",
	legend: "jt-legend",
	dot: "jt-dot",
} as const;

/** CSS-переменные темы Obsidian. */
export const CSS_VARS = {
	colorGreen: "--color-green",
	colorYellow: "--color-yellow",
	colorRed: "--color-red",
	accent: "--interactive-accent",
	textMuted: "--text-muted",
	border: "--background-modifier-border",
} as const;

/** Фолбэки, если CSS-переменная не задана темой. */
export const COLOR_FALLBACKS = {
	good: "#3fb950",
	warn: "#d29922",
	bad: "#f85149",
	accent: "#58a6ff",
	muted: "#8b949e",
	grid: "rgba(139,148,158,0.2)",
} as const;

/** Типы и опции Chart.js. */
export const CHART_TYPE_LINE = "line";
export const CHART_TYPE_BAR = "bar";
export const CHART_AXIS_Y = "y";
export const CHART_LEGEND_POSITION_BOTTOM = "bottom";
/** Максимум символов в строке подписи оси X (длинные названия переносятся). */
export const AXIS_LABEL_WRAP_CHARS = 16;

/** Таблица критериев в заметке. */
export const TABLE_LINE_SEPARATOR = "\n";
export const TABLE_CELL_SEPARATOR = "|";
export const TABLE_ROW_PREFIX = "|";

/** Разделители и суффиксы форматирования чисел. */
export const HEADER_LIST_SEPARATOR = "·";
export const HEADER_RANGE_SEPARATOR = "—";
export const GRADE_SUFFIX = "/6";
export const GRADE_PART_SEPARATOR = "·";
export const PERCENT_SUFFIX = "%";
export const SCORE_AX_SUFFIX = " / 6";
