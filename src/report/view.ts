import { ItemView, WorkspaceLeaf, debounce } from "obsidian";
import type { Chart } from "chart.js";
import * as constants from "../constants";
import { NEXT_LANG, formatDate } from "../i18n";
import type JobtrekReportPlugin from "../main";
import { gradeBand } from "./bands";
import { categoriesChart, recurringChart, trendChart } from "./charts";
import { aggregate, loadEvaluations, recurringCandidates } from "./data";
import { applyChartDefaults, readThemeColors } from "./theme";

export class ReportView extends ItemView {
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
