// Все строковые литералы, вынесенные из main.ts.
// Технические числа/пороги (4.6, 5.15, ...) оставлены в логике.

export const VIEW_TYPE = "jobtrek-report-view";

export const RIBBON_ICON = "bar-chart-3";
export const RIBBON_TOOLTIP = "Отчёт Jobtrek";

export const COMMAND_ID = "open-jobtrek-report";
export const COMMAND_NAME = "Открыть отчёт Jobtrek";

export const NEW_TAB_LEAF_TYPE = "tab";

export const LANG_ACTION_ICON = "languages";

export const VIEW_DISPLAY_TEXT = "Отчёт Jobtrek";
export const VIEW_ICON = "bar-chart-3";

export const EVENT_METADATA_CHANGED = "changed";
export const EVENT_VAULT_DELETE = "delete";
export const EVENT_CSS_CHANGE = "css-change";

/** Значение frontmatter `type`, по которому находим оценки. */
export const FRONTMATTER_EVALUATION_TYPE = "jobtrek-evaluation";

/** Подписи категорий критериев. Ключи — доменные ключи категорий. */
export const CAT_LABELS: Record<string, string> = {
	git: "Git / доска задач",
	commits: "Conventional Commits",
	docs: "Документация",
	tooling: "Тулинг (lint/format/build)",
	core: "Основной функционал (CRUD)",
	validation: "Валидация и обработка ошибок",
	architecture: "Архитектура и dead code",
	ui_ux: "UI/UX и адаптивность",
	type_safety: "Дисциплина типизации",
	security: "Безопасность",
	spec: "Соответствие ТЗ/контракту",
	communication: "Коммуникация / защита",
};

/** Заголовки и пользовательские тексты. */
export const TEXT_EMPTY_TITLE = "Отчёт Jobtrek";
export const TEXT_EMPTY_HINT =
	"Не найдено ни одной оценки. Создай заметки с frontmatter `type: jobtrek-evaluation` (см. примеры в sample-notes).";
export const TEXT_HEADER_TITLE = "Оценки Jobtrek";
export const TEXT_CHART_TREND_TITLE = "Динамика итоговой оценки";
export const TEXT_CHART_CATEGORIES_TITLE = "По категориям: где теряются баллы";
export const TEXT_CHART_RECURRING_TITLE = "Что повторяется от проекта к проекту";
export const TEXT_CHART_RECURRING_HINT =
	"Самые слабые категории, которые встречаются минимум в трёх проектах. Разрыв в линии: такого критерия в оценке не было.";
export const TEXT_TREND_DATASET_LABEL = "% от максимума";

export const LEGEND_ITEMS: Array<[string, string]> = [
	["bad", "< 4.3 требует внимания"],
	["warn", "4.3–4.8 нестабильно"],
	["good", "> 4.8 стабильно"],
];

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
export const CHART_AXIS_X = "x";
export const CHART_LEGEND_POSITION_BOTTOM = "bottom";

/** Формат даты и таблица критериев. */
export const DATE_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;
export const DATE_DOT_SEPARATOR = ".";
export const TABLE_LINE_SEPARATOR = "\n";
export const TABLE_CELL_SEPARATOR = "|";
export const TABLE_ROW_PREFIX = "|";

/** Разделители и суффиксы форматирования чисел. */
export const HEADER_PROJECTS_SUFFIX = "проектов";
export const HEADER_LIST_SEPARATOR = "·";
export const HEADER_RANGE_SEPARATOR = "—";
export const GRADE_SUFFIX = "/6";
export const GRADE_PART_SEPARATOR = "·";
export const PERCENT_SUFFIX = "%";
export const SCORE_AX_SUFFIX = " / 6";
