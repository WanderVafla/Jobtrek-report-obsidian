// Локализация отчёта: русский, английский, французский.
// Техническая статика (CSS, Chart.js, события) остаётся в constants.ts.

export type Lang = "ru" | "en" | "fr";

export const LANGS: Lang[] = ["ru", "en", "fr"];

export const NEXT_LANG: Record<Lang, Lang> = {
	ru: "en",
	en: "fr",
	fr: "ru",
};

export const LANG_LABEL: Record<Lang, string> = {
	ru: "Русский",
	en: "English",
	fr: "Français",
};

export interface ReportStrings {
	viewDisplayText: string;
	ribbonTooltip: string;
	commandName: string;
	toggleLangTitle: string;
	emptyTitle: string;
	emptyHint: string;
	headerTitle: string;
	trendTitle: string;
	categoriesTitle: string;
	recurringTitle: string;
	recurringHint: string;
	trendDatasetLabel: string;
	projectsSuffix: string;
	catLabels: Record<string, string>;
	legendItems: Array<[string, string]>;
	importCommand: string;
	importAllCommand: string;
	menuImport: string;
	importOk: string;
	importChecks: string;
	alreadyImported: string;
	notEvaluation: string;
	importError: string;
	importAllDone: string;
	pdfFolderNotSet: string;
	settingPdfFolder: string;
	settingPdfFolderDesc: string;
	settingNotesFolder: string;
	settingNotesFolderDesc: string;
	settingAutoImport: string;
	settingAutoImportDesc: string;
}

export const STRINGS: Record<Lang, ReportStrings> = {
	ru: {
		viewDisplayText: "Отчёт Jobtrek",
		ribbonTooltip: "Отчёт Jobtrek",
		commandName: "Открыть отчёт Jobtrek",
		toggleLangTitle: "Переключить язык",
		emptyTitle: "Отчёт Jobtrek",
		emptyHint:
			"Не найдено ни одной оценки. Создай заметки с frontmatter `type: jobtrek-evaluation` (см. примеры в sample-notes).",
		headerTitle: "Оценки Jobtrek",
		trendTitle: "Динамика итоговой оценки",
		categoriesTitle: "По категориям: где теряются баллы",
		recurringTitle: "Что повторяется от проекта к проекту",
		recurringHint:
			"Самые слабые категории, которые встречаются минимум в трёх проектах. Разрыв в линии: такого критерия в оценке не было.",
		trendDatasetLabel: "% от максимума",
		projectsSuffix: "проектов",
		catLabels: {
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
		},
		legendItems: [
			["bad", "< 4.3 требует внимания"],
			["warn", "4.3–4.8 нестабильно"],
			["good", "> 4.8 стабильно"],
		],
		importCommand: "Импортировать PDF оценки (текущий файл)",
		importAllCommand: "Импортировать все PDF оценки из папки",
		menuImport: "Импортировать как оценку Jobtrek",
		importOk: "Оценка импортирована:",
		importChecks: "Импортировано, но проверка не прошла:",
		alreadyImported: "Уже импортировано:",
		notEvaluation: "Это не PDF оценки Jobtrek:",
		importError: "Не удалось прочитать PDF:",
		importAllDone: "Создано заметок:",
		pdfFolderNotSet: "Сначала укажи папку с PDF в настройках плагина.",
		settingPdfFolder: "Папка с PDF оценками",
		settingPdfFolderDesc: "PDF в этой папке (и подпапках) импортируются автоматически: уже лежащие при запуске, новые сразу. Пусто: автоимпорт выключен.",
		settingNotesFolder: "Папка для заметок",
		settingNotesFolderDesc: "Куда класть созданные заметки. Пусто: рядом с PDF.",
		settingAutoImport: "Автоимпорт",
		settingAutoImportDesc: "Создавать заметки для PDF из папки без участия пользователя.",
	},
	en: {
		viewDisplayText: "Jobtrek Report",
		ribbonTooltip: "Jobtrek Report",
		commandName: "Open Jobtrek report",
		toggleLangTitle: "Switch language",
		emptyTitle: "Jobtrek Report",
		emptyHint:
			"No evaluations found. Create notes with frontmatter `type: jobtrek-evaluation` (see examples in sample-notes).",
		headerTitle: "Jobtrek Evaluations",
		trendTitle: "Final grade trend",
		categoriesTitle: "By category: where points are lost",
		recurringTitle: "What repeats from project to project",
		recurringHint:
			"The weakest categories present in at least three projects. A gap in the line means that criterion was missing from the evaluation.",
		trendDatasetLabel: "% of maximum",
		projectsSuffix: "projects",
		catLabels: {
			git: "Git / task board",
			commits: "Conventional Commits",
			docs: "Documentation",
			tooling: "Tooling (lint/format/build)",
			core: "Core features (CRUD)",
			validation: "Validation & error handling",
			architecture: "Architecture & dead code",
			ui_ux: "UI/UX & responsiveness",
			type_safety: "Typing discipline",
			security: "Security",
			spec: "Spec / contract compliance",
			communication: "Communication / defense",
		},
		legendItems: [
			["bad", "< 4.3 needs attention"],
			["warn", "4.3–4.8 unstable"],
			["good", "> 4.8 stable"],
		],
		importCommand: "Import evaluation PDF (current file)",
		importAllCommand: "Import all evaluation PDFs from folder",
		menuImport: "Import as Jobtrek evaluation",
		importOk: "Evaluation imported:",
		importChecks: "Imported, but the check failed:",
		alreadyImported: "Already imported:",
		notEvaluation: "Not a Jobtrek evaluation PDF:",
		importError: "Could not read PDF:",
		importAllDone: "Notes created:",
		pdfFolderNotSet: "Set the PDF folder in the plugin settings first.",
		settingPdfFolder: "Evaluation PDF folder",
		settingPdfFolderDesc: "PDFs in this folder (and subfolders) are imported automatically: existing ones on startup, new ones right away. Empty: auto-import is off.",
		settingNotesFolder: "Notes folder",
		settingNotesFolderDesc: "Where to put created notes. Empty: next to the PDF.",
		settingAutoImport: "Auto-import",
		settingAutoImportDesc: "Create notes for PDFs in the folder without any action from you.",
	},
	fr: {
		viewDisplayText: "Rapport Jobtrek",
		ribbonTooltip: "Rapport Jobtrek",
		commandName: "Ouvrir le rapport Jobtrek",
		toggleLangTitle: "Changer de langue",
		emptyTitle: "Rapport Jobtrek",
		emptyHint:
			"Aucune évaluation trouvée. Créez des notes avec le frontmatter `type: jobtrek-evaluation` (voir les exemples dans sample-notes).",
		headerTitle: "Évaluations Jobtrek",
		trendTitle: "Évolution de la note finale",
		categoriesTitle: "Par catégories : où les points sont perdus",
		recurringTitle: "Ce qui se répète de projet en projet",
		recurringHint:
			"Les catégories les plus faibles présentes dans au moins trois projets. Une rupture de ligne signifie que ce critère était absent de l'évaluation.",
		trendDatasetLabel: "% du maximum",
		projectsSuffix: "projets",
		catLabels: {
			git: "Git / tableau des tâches",
			commits: "Conventional Commits",
			docs: "Documentation",
			tooling: "Outillage (lint/format/build)",
			core: "Fonctionnalité principale (CRUD)",
			validation: "Validation et gestion d'erreurs",
			architecture: "Architecture et code mort",
			ui_ux: "UI/UX et adaptabilité",
			type_safety: "Discipline de typage",
			security: "Sécurité",
			spec: "Conformité au cahier des charges",
			communication: "Communication / soutenance",
		},
		legendItems: [
			["bad", "< 4,3 à surveiller"],
			["warn", "4,3–4,8 instable"],
			["good", "> 4,8 stable"],
		],
		importCommand: "Importer le PDF d'évaluation (fichier courant)",
		importAllCommand: "Importer tous les PDF d'évaluation du dossier",
		menuImport: "Importer comme évaluation Jobtrek",
		importOk: "Évaluation importée :",
		importChecks: "Importée, mais la vérification a échoué :",
		alreadyImported: "Déjà importé :",
		notEvaluation: "Ce n'est pas un PDF d'évaluation Jobtrek :",
		importError: "Impossible de lire le PDF :",
		importAllDone: "Notes créées :",
		pdfFolderNotSet: "Indique d'abord le dossier des PDF dans les réglages du plugin.",
		settingPdfFolder: "Dossier des PDF d'évaluation",
		settingPdfFolderDesc: "Les PDF de ce dossier (et sous-dossiers) sont importés automatiquement : les existants au démarrage, les nouveaux aussitôt. Vide : import automatique désactivé.",
		settingNotesFolder: "Dossier des notes",
		settingNotesFolderDesc: "Où placer les notes créées. Vide : à côté du PDF.",
		settingAutoImport: "Import automatique",
		settingAutoImportDesc: "Créer les notes pour les PDF du dossier sans action de ta part.",
	},
};

export function getStrings(lang: Lang): ReportStrings {
	return STRINGS[lang] ?? STRINGS.ru;
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Формат даты зависит от языка: RU — DD.MM.YYYY, FR — DD/MM/YYYY, EN — YYYY-MM-DD. */
export function formatDate(iso: string, lang: Lang): string {
	const m = ISO_RE.exec(iso);
	if (!m) return iso;
	if (lang === "en") return `${m[1]}-${m[2]}-${m[3]}`;
	if (lang === "fr") return `${m[3]}/${m[2]}/${m[1]}`;
	return `${m[3]}.${m[2]}.${m[1]}`;
}

export function normalizeLang(value: unknown): Lang {
	return value === "en" || value === "fr" ? value : "ru";
}
