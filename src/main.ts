import {
	ItemView,
	Plugin,
	TFile,
	WorkspaceLeaf,
	debounce,
} from "obsidian";
import type { Chart } from "chart.js";
import * as constants from "./constants";
import { Lang, NEXT_LANG, formatDate, getStrings, normalizeLang } from "./i18n";
import { PdfImporter } from "./import/importer";
import { gradeBand } from "./report/bands";
import { categoriesChart, recurringChart, trendChart } from "./report/charts";
import { aggregate, loadEvaluations, recurringCandidates } from "./report/data";
import { applyChartDefaults, readThemeColors } from "./report/theme";
import { DEFAULT_SETTINGS, JobtrekReportSettings, JobtrekSettingTab } from "./settings";

export default class JobtrekReportPlugin extends Plugin {
	settings: JobtrekReportSettings = DEFAULT_SETTINGS;
	private ribbonEl: HTMLElement | null = null;
	readonly importer = new PdfImporter(this);

	async onload() {
		await this.loadSettings();
		this.registerView(constants.VIEW_TYPE, (leaf) => new ReportView(leaf, this));
		this.ribbonEl = this.addRibbonIcon(
			constants.RIBBON_ICON,
			this.getStrings().ribbonTooltip,
			() => this.activateView()
		);
		this.addCommand({
			id: constants.COMMAND_ID,
			name: this.getStrings().commandName,
			callback: () => this.activateView(),
		});
		this.addCommand({
			id: constants.COMMAND_IMPORT_PDF_ID,
			name: this.getStrings().importCommand,
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== constants.PDF_EXTENSION) return false;
				if (!checking) void this.importer.importPdf(file, true);
				return true;
			},
		});
		this.addCommand({
			id: constants.COMMAND_IMPORT_ALL_ID,
			name: this.getStrings().importAllCommand,
			callback: () => this.importer.importAll(),
		});
		this.registerEvent(
			this.app.workspace.on(constants.EVENT_FILE_MENU, (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== constants.PDF_EXTENSION) return;
				menu.addItem((item) =>
					item
						.setTitle(this.getStrings().menuImport)
						.setIcon(constants.IMPORT_ICON)
						.onClick(() => this.importer.importPdf(file, true))
				);
			})
		);
		// После onLayoutReady, чтобы не ловить "create" для всех файлов при старте.
		// PDF, которые уже лежат в папке, подхватывает scanFolder.
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on(constants.EVENT_VAULT_CREATE, (file) => this.importer.onFileCreated(file)));
			void this.importer.scanFolder();
		});
		this.addSettingTab(new JobtrekSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(constants.VIEW_TYPE);
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...data,
			lang: normalizeLang(data?.lang),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getStrings() {
		return getStrings(this.settings.lang);
	}

	/** Переключить язык по кругу ru → en → fr и перерисовать все открытые вью. */
	async setLang(lang: Lang) {
		this.settings.lang = lang;
		await this.saveSettings();
		const t = this.getStrings();
		if (this.ribbonEl) {
			this.ribbonEl.setAttribute("aria-label", t.ribbonTooltip);
			this.ribbonEl.setAttribute("title", t.ribbonTooltip);
		}
		for (const leaf of this.app.workspace.getLeavesOfType(constants.VIEW_TYPE)) {
			if (leaf.view instanceof ReportView) {
				await leaf.view.refreshLanguage();
			}
		}
	}

	async activateView() {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(constants.VIEW_TYPE);
		if (existing.length > 0) {
			workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = workspace.getLeaf(constants.NEW_TAB_LEAF_TYPE);
		await leaf.setViewState({ type: constants.VIEW_TYPE, active: true });
		workspace.revealLeaf(leaf);
	}
}

class ReportView extends ItemView {
	private charts: Chart[] = [];
	private plugin: JobtrekReportPlugin;
	private langAction: HTMLElement | null = null;
	private importAction: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: JobtrekReportPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return constants.VIEW_TYPE;
	}
	getDisplayText() {
		return this.plugin.getStrings().viewDisplayText;
	}
	getIcon() {
		return constants.VIEW_ICON;
	}

	async onOpen() {
		this.importAction = this.addAction(
			constants.IMPORT_ICON,
			this.plugin.getStrings().importAllCommand,
			() => this.plugin.importer.importAll()
		);
		this.langAction = this.addAction(
			constants.LANG_ACTION_ICON,
			this.plugin.getStrings().toggleLangTitle,
			() => this.cycleLang()
		);
		await this.render();
		const refresh = debounce(() => this.render(), 600, true);
		this.registerEvent(this.app.metadataCache.on(constants.EVENT_METADATA_CHANGED, refresh));
		this.registerEvent(this.app.vault.on(constants.EVENT_VAULT_DELETE, refresh));
		this.registerEvent(this.app.workspace.on(constants.EVENT_CSS_CHANGE, refresh));
	}

	async onClose() {
		this.destroyCharts();
	}

	/** Вызывается плагином после смены языка: обновить кнопку и контент. */
	async refreshLanguage() {
		const t = this.plugin.getStrings();
		if (this.langAction) {
			this.langAction.setAttribute("aria-label", t.toggleLangTitle);
			this.langAction.setAttribute("title", t.toggleLangTitle);
		}
		if (this.importAction) {
			this.importAction.setAttribute("aria-label", t.importAllCommand);
			this.importAction.setAttribute("title", t.importAllCommand);
		}
		await this.render();
	}

	private async cycleLang() {
		await this.plugin.setLang(NEXT_LANG[this.plugin.settings.lang]);
	}

	private destroyCharts() {
		this.charts.forEach((c) => c.destroy());
		this.charts = [];
	}

	private async render() {
		this.destroyCharts();
		const lang = this.plugin.settings.lang;
		const t = this.plugin.getStrings();
		const fmt = (iso: string) => formatDate(iso, lang);
		const root = this.contentEl;
		root.empty();
		root.addClass(constants.CSS_CLASSES.report);

		const evals = await loadEvaluations(this.app);
		if (evals.length === 0) {
			root.createEl("h1", { text: t.emptyTitle });
			root.createEl("p", {
				text: t.emptyHint,
				cls: constants.CSS_CLASSES.muted,
			});
			return;
		}

		const col = readThemeColors();
		applyChartDefaults(col);

		// header
		const head = root.createDiv({ cls: constants.CSS_CLASSES.head });
		head.createEl("h1", { text: t.headerTitle });
		const first = evals[0];
		const last = evals[evals.length - 1];
		head.createEl("p", {
			cls: constants.CSS_CLASSES.muted,
			text: `${evals.length} ${t.projectsSuffix} ${constants.HEADER_LIST_SEPARATOR} ${fmt(first.date)} ${constants.HEADER_RANGE_SEPARATOR} ${fmt(last.date)}`,
		});

		// timeline
		const tl = root.createDiv({ cls: constants.CSS_CLASSES.timeline });
		for (const e of evals) {
			const band = gradeBand(e.grade);
			const pct = e.max ? ((e.points / e.max) * 100).toFixed(1) : "0";
			const item = tl.createDiv({ cls: constants.CSS_CLASSES.timelineItem });
			item.createSpan({ cls: `${constants.CSS_CLASSES.timelineDot} ${band}` });
			const row = item.createDiv({ cls: constants.CSS_CLASSES.timelineHead });
			row.createSpan({ cls: constants.CSS_CLASSES.timelineDate, text: fmt(e.date) });
			row.createSpan({ cls: constants.CSS_CLASSES.timelineTitle, text: e.project });
			if (e.stack) row.createSpan({ cls: constants.CSS_CLASSES.timelineStack, text: e.stack });
			row.createSpan({ cls: `${constants.CSS_CLASSES.timelineGrade} ${band}`, text: `${e.grade.toFixed(1)}${constants.GRADE_SUFFIX} ${constants.GRADE_PART_SEPARATOR} ${pct}${constants.PERCENT_SUFFIX}` });
			if (e.note) item.createDiv({ cls: constants.CSS_CLASSES.timelineNote, text: e.note });
		}

		// chart 1: trend
		root.createEl("h2", { text: t.trendTitle });
		this.charts.push(trendChart(root, evals, col, t));

		// chart 2: categories
		const agg = aggregate(evals);
		root.createEl("h2", { text: t.categoriesTitle });
		this.charts.push(categoriesChart(root, agg.ranked, col, t));
		const legend = root.createDiv({ cls: constants.CSS_CLASSES.legend });
		for (const [band, text] of t.legendItems) {
			const s = legend.createSpan();
			s.createEl("i", { cls: `${constants.CSS_CLASSES.dot} ${band}` });
			s.appendText(" " + text);
		}

		// chart 3: recurring weakest categories
		const candidates = recurringCandidates(evals, agg);
		if (candidates.length > 0) {
			root.createEl("h2", { text: t.recurringTitle });
			root.createEl("p", {
				cls: constants.CSS_CLASSES.muted,
				text: t.recurringHint,
			});
			this.charts.push(recurringChart(root, evals, candidates, agg.perProject, col, t));
		}
	}
}
