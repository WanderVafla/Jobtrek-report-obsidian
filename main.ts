import {
	App,
	ItemView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	WorkspaceLeaf,
	debounce,
	loadPdfJs,
	normalizePath,
} from "obsidian";
import { Chart, registerables } from "chart.js";
import * as constants from "./constants";
import { Lang, NEXT_LANG, formatDate, getStrings, normalizeLang } from "./i18n";
import { buildNote, extractPdfText, noteFileName, parseEvaluation } from "./pdfImport";

Chart.register(...registerables);

interface Criterion {
	name: string;
	weight: number;
	grade: number;
	category: string;
}

interface Evaluation {
	project: string;
	date: string;
	stack: string;
	grade: number;
	points: number;
	max: number;
	note: string;
	criteria: Criterion[];
}

interface JobtrekReportSettings {
	lang: Lang;
	/** Папка, за которой следит автоимпорт PDF. Пусто: автоимпорт выключен. */
	pdfFolder: string;
	/** Куда класть созданные заметки. Пусто: рядом с PDF. */
	notesFolder: string;
	autoImport: boolean;
}

const DEFAULT_SETTINGS: JobtrekReportSettings = { lang: "ru", pdfFolder: "", notesFolder: "", autoImport: true };

type Band = "good" | "warn" | "bad";

const gradeBand = (g: number): Band => (g < 4.6 ? "bad" : g < 5.15 ? "warn" : "good");
const scoreBand = (v: number): Band => (v < 4.3 ? "bad" : v <= 4.8 ? "warn" : "good");

function parseCriteria(text: string): Criterion[] {
	const out: Criterion[] = [];
	for (const line of text.split(constants.TABLE_LINE_SEPARATOR)) {
		const t = line.trim();
		if (!t.startsWith(constants.TABLE_ROW_PREFIX)) continue;
		const cells = t.split(constants.TABLE_CELL_SEPARATOR).slice(1, -1).map((c) => c.trim());
		if (cells.length < 4) continue;
		const weight = parseFloat(cells[1]);
		const grade = parseFloat(cells[2]);
		if (Number.isNaN(weight) || Number.isNaN(grade)) continue;
		out.push({ name: cells[0], weight, grade, category: cells[3] });
	}
	return out;
}

export default class JobtrekReportPlugin extends Plugin {
	settings: JobtrekReportSettings = DEFAULT_SETTINGS;
	private ribbonEl: HTMLElement | null = null;
	/** PDF, которые сейчас импортируются: событие create и сканирование папки не должны создать дубль. */
	private importing = new Set<string>();
	/** Пересканировать папку после смены настроек (не на каждый символ в поле ввода). */
	readonly rescan = debounce(() => void this.scanFolder(), constants.RESCAN_DEBOUNCE_MS, true);

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
				if (!checking) void this.importPdf(file, true);
				return true;
			},
		});
		this.addCommand({
			id: constants.COMMAND_IMPORT_ALL_ID,
			name: this.getStrings().importAllCommand,
			callback: () => this.importAll(),
		});
		this.registerEvent(
			this.app.workspace.on(constants.EVENT_FILE_MENU, (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== constants.PDF_EXTENSION) return;
				menu.addItem((item) =>
					item
						.setTitle(this.getStrings().menuImport)
						.setIcon(constants.IMPORT_ICON)
						.onClick(() => this.importPdf(file, true))
				);
			})
		);
		// После onLayoutReady, чтобы не ловить "create" для всех файлов при старте.
		// PDF, которые уже лежат в папке, подхватывает scanFolder.
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on(constants.EVENT_VAULT_CREATE, (file) => this.onFileCreated(file)));
			void this.scanFolder();
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

	private inPdfFolder(file: TFile): boolean {
		const raw = this.settings.pdfFolder.trim();
		if (!raw) return false;
		const folder = normalizePath(raw);
		return folder === "/" || file.path.startsWith(folder + "/");
	}

	private onFileCreated(file: TAbstractFile) {
		if (!this.settings.autoImport) return;
		if (!(file instanceof TFile) || file.extension !== constants.PDF_EXTENSION || !this.inPdfFolder(file)) return;
		// Синхронизация может создать файл раньше, чем допишет содержимое: одна повторная попытка.
		void this.importPdf(file, false).catch(() =>
			window.setTimeout(
				() => void this.importPdf(file, false).catch((e) => console.error(`Jobtrek: import failed ${file.path}`, e)),
				constants.IMPORT_RETRY_MS
			)
		);
	}

	/** Уже есть заметка-оценка, чей `source` ссылается на этот PDF. */
	private isImported(pdf: TFile): boolean {
		const { metadataCache, vault } = this.app;
		for (const note of vault.getMarkdownFiles()) {
			const fm = metadataCache.getFileCache(note)?.frontmatter;
			if (!fm || fm.type !== constants.FRONTMATTER_EVALUATION_TYPE || typeof fm.source !== "string") continue;
			const link = fm.source.replace(/^\[\[|\]\]$/g, "").split("|")[0];
			if (metadataCache.getFirstLinkpathDest(link, note.path) === pdf) return true;
		}
		return false;
	}

	/**
	 * PDF → заметка-оценка. manual: уведомлять обо всех исходах и открыть заметку.
	 * В авто-режиме чужие PDF (не оценки) молча пропускаются. Ошибки чтения PDF пробрасываются.
	 */
	async importPdf(pdf: TFile, manual: boolean): Promise<TFile | null> {
		const t = this.getStrings();
		if (this.importing.has(pdf.path)) return null;
		if (this.isImported(pdf)) {
			if (manual) new Notice(`${t.alreadyImported} ${pdf.name}`);
			return null;
		}
		this.importing.add(pdf.path);
		try {
			return await this.createNote(pdf, manual);
		} finally {
			this.importing.delete(pdf.path);
		}
	}

	private async createNote(pdf: TFile, manual: boolean): Promise<TFile | null> {
		const t = this.getStrings();
		let text: string;
		try {
			text = await extractPdfText(await loadPdfJs(), await this.app.vault.readBinary(pdf));
		} catch (e) {
			console.error(`Jobtrek: cannot read PDF ${pdf.path}`, e);
			if (manual) new Notice(`${t.importError} ${pdf.name}`);
			throw e;
		}
		const ev = parseEvaluation(text);
		if (ev.criteria.length === 0 && ev.head.max === undefined) {
			if (manual) new Notice(`${t.notEvaluation} ${pdf.name}`);
			return null;
		}
		const folder = normalizePath(this.settings.notesFolder.trim() || pdf.parent?.path || "/");
		if (folder !== "/" && !this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
		const path = normalizePath(`${folder}/${noteFileName(ev, pdf.basename)}`);
		if (this.app.vault.getAbstractFileByPath(path)) {
			if (manual) new Notice(`${t.alreadyImported} ${path}`);
			return null;
		}
		const note = await this.app.vault.create(path, buildNote(ev, pdf.basename, `[[${pdf.path}]]`));
		new Notice(
			ev.problems.length
				? `${t.importChecks} ${note.basename}\n${ev.problems.join("\n")}`
				: `${t.importOk} ${note.basename}`,
			ev.problems.length ? 0 : undefined
		);
		if (manual) await this.app.workspace.getLeaf(constants.NEW_TAB_LEAF_TYPE).openFile(note);
		return note;
	}

	/** Команда: импортировать все ещё не импортированные PDF из папки настроек. */
	async importAll() {
		const t = this.getStrings();
		if (!this.settings.pdfFolder.trim()) {
			new Notice(t.pdfFolderNotSet);
			return;
		}
		new Notice(`${t.importAllDone} ${await this.importFolder()}`);
	}

	/** Автоимпорт PDF, которые уже лежат в папке (старт плагина, смена настроек). */
	private async scanFolder() {
		if (!this.settings.autoImport || !this.settings.pdfFolder.trim()) return;
		const created = await this.importFolder();
		if (created > 0) new Notice(`${this.getStrings().importAllDone} ${created}`);
	}

	private async importFolder(): Promise<number> {
		const t = this.getStrings();
		let created = 0;
		for (const file of this.app.vault.getFiles()) {
			if (file.extension !== constants.PDF_EXTENSION || !this.inPdfFolder(file)) continue;
			try {
				if (await this.importPdf(file, false)) created++;
			} catch {
				new Notice(`${t.importError} ${file.name}`);
			}
		}
		return created;
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
		await this.render();
	}

	private async cycleLang() {
		await this.plugin.setLang(NEXT_LANG[this.plugin.settings.lang]);
	}

	private destroyCharts() {
		this.charts.forEach((c) => c.destroy());
		this.charts = [];
	}

	private async loadEvaluations(): Promise<Evaluation[]> {
		const list: Evaluation[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm || fm.type !== constants.FRONTMATTER_EVALUATION_TYPE) continue;
			const criteria = parseCriteria(await this.app.vault.cachedRead(file));
			const sumW = criteria.reduce((s, c) => s + c.weight, 0);
			const sumWG = criteria.reduce((s, c) => s + c.weight * c.grade, 0);
			const max = Number(fm.max) || sumW * 6;
			const points = Number(fm.points) || sumWG;
			list.push({
				project: String(fm.project ?? file.basename),
				date: String(fm.date ?? ""),
				stack: String(fm.stack ?? ""),
				grade: Number(fm.grade) || (max ? (points / max) * 6 : 0),
				points,
				max,
				note: String(fm.note ?? ""),
				criteria,
			});
		}
		return list.sort((a, b) => a.date.localeCompare(b.date));
	}

	private async render() {
		this.destroyCharts();
		const lang = this.plugin.settings.lang;
		const t = this.plugin.getStrings();
		const fmt = (iso: string) => formatDate(iso, lang);
		const root = this.contentEl;
		root.empty();
		root.addClass(constants.CSS_CLASSES.report);

		const evals = await this.loadEvaluations();
		if (evals.length === 0) {
			root.createEl("h1", { text: t.emptyTitle });
			root.createEl("p", {
				text: t.emptyHint,
				cls: constants.CSS_CLASSES.muted,
			});
			return;
		}

		const css = getComputedStyle(document.body);
		const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
		const COL = {
			good: v(constants.CSS_VARS.colorGreen, constants.COLOR_FALLBACKS.good),
			warn: v(constants.CSS_VARS.colorYellow, constants.COLOR_FALLBACKS.warn),
			bad: v(constants.CSS_VARS.colorRed, constants.COLOR_FALLBACKS.bad),
			accent: v(constants.CSS_VARS.accent, constants.COLOR_FALLBACKS.accent),
		};
		const muted = v(constants.CSS_VARS.textMuted, constants.COLOR_FALLBACKS.muted);
		const grid = v(constants.CSS_VARS.border, constants.COLOR_FALLBACKS.grid);
		Chart.defaults.color = muted;
		Chart.defaults.font.size = 12;

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
		const pcts = evals.map((e) => (e.max ? (e.points / e.max) * 100 : 0));
		const c1 = this.chartBox(root);
		this.charts.push(
			new Chart(c1, {
				type: constants.CHART_TYPE_LINE,
				data: {
					labels: evals.map((e) => e.project),
					datasets: [
						{
							label: t.trendDatasetLabel,
							data: pcts,
							borderColor: COL.accent,
							backgroundColor: COL.accent,
							pointBackgroundColor: evals.map((e) => COL[gradeBand(e.grade)]),
							pointRadius: 6,
							pointHoverRadius: 8,
							tension: 0.25,
							borderWidth: 2,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: { callbacks: { label: (ctx) => `${(ctx.parsed.y ?? 0).toFixed(1)}${constants.PERCENT_SUFFIX}` } },
					},
					scales: {
						y: {
							min: Math.max(0, Math.floor(Math.min(...pcts) / 5) * 5 - 5),
							max: Math.min(100, Math.ceil(Math.max(...pcts) / 5) * 5 + 5),
							grid: { color: grid },
							ticks: { callback: (val) => `${val}${constants.PERCENT_SUFFIX}` },
						},
						x: { grid: { display: false } },
					},
				},
			})
		);

		// aggregation
		const overall: Record<string, { wg: number; w: number }> = {};
		const perProject: Record<string, Record<string, number | null>> = {};
		for (const e of evals) {
			const agg: Record<string, { wg: number; w: number }> = {};
			for (const c of e.criteria) {
				agg[c.category] ??= { wg: 0, w: 0 };
				agg[c.category].wg += c.weight * c.grade;
				agg[c.category].w += c.weight;
				overall[c.category] ??= { wg: 0, w: 0 };
				overall[c.category].wg += c.weight * c.grade;
				overall[c.category].w += c.weight;
			}
			perProject[e.project] = {};
			for (const k of Object.keys(agg)) perProject[e.project][k] = agg[k].wg / agg[k].w;
		}
		const ranked = Object.entries(overall)
			.map(([k, a]) => ({ key: k, value: a.wg / a.w }))
			.sort((a, b) => a.value - b.value);

		// chart 2: categories
		root.createEl("h2", { text: t.categoriesTitle });
		const c2 = this.chartBox(root, true);
		this.charts.push(
			new Chart(c2, {
				type: constants.CHART_TYPE_BAR,
				data: {
					labels: ranked.map((r) => t.catLabels[r.key] ?? r.key),
					datasets: [
						{
							data: ranked.map((r) => Number(r.value.toFixed(2))),
							backgroundColor: ranked.map((r) => COL[scoreBand(r.value)]),
							borderRadius: 4,
						},
					],
				},
				options: {
					indexAxis: constants.CHART_AXIS_Y,
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x}${constants.SCORE_AX_SUFFIX}` } },
					},
					scales: { x: { min: 0, max: 6, grid: { color: grid } }, y: { grid: { display: false } } },
				},
			})
		);
		const legend = root.createDiv({ cls: constants.CSS_CLASSES.legend });
		for (const [band, text] of t.legendItems) {
			const s = legend.createSpan();
			s.createEl("i", { cls: `${constants.CSS_CLASSES.dot} ${band}` });
			s.appendText(" " + text);
		}

		// chart 3: recurring weakest categories
		const names = evals.map((e) => e.project);
		const candidates = ranked
			.filter((r) => names.filter((n) => perProject[n][r.key] != null).length >= 3)
			.slice(0, 4);
		if (candidates.length > 0) {
			root.createEl("h2", { text: t.recurringTitle });
			root.createEl("p", {
				cls: constants.CSS_CLASSES.muted,
				text: t.recurringHint,
			});
			const palette = [COL.bad, COL.accent, COL.warn, COL.good];
			const c3 = this.chartBox(root, true);
			this.charts.push(
				new Chart(c3, {
					type: constants.CHART_TYPE_LINE,
					data: {
						labels: names,
						datasets: candidates.map((c, i) => ({
							label: t.catLabels[c.key] ?? c.key,
							data: names.map((n) => perProject[n][c.key] ?? null),
							borderColor: palette[i],
							backgroundColor: palette[i],
							tension: 0.2,
							spanGaps: false,
						})),
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: { legend: { position: constants.CHART_LEGEND_POSITION_BOTTOM, labels: { boxWidth: 10, boxHeight: 10 } } },
						scales: { y: { min: 2, max: 6, grid: { color: grid } }, x: { grid: { display: false } } },
					},
				})
			);
		}
	}

	private chartBox(parent: HTMLElement, tall = false): HTMLCanvasElement {
		const box = parent.createDiv({ cls: tall ? constants.CSS_CLASSES.chartBoxTall : constants.CSS_CLASSES.chartBox });
		return box.createEl("canvas");
	}
}

class JobtrekSettingTab extends PluginSettingTab {
	private plugin: JobtrekReportPlugin;

	constructor(app: App, plugin: JobtrekReportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const t = this.plugin.getStrings();
		const s = this.plugin.settings;
		this.containerEl.empty();
		new Setting(this.containerEl)
			.setName(t.settingPdfFolder)
			.setDesc(t.settingPdfFolderDesc)
			.addText((text) =>
				text.setPlaceholder(constants.PDF_FOLDER_PLACEHOLDER).setValue(s.pdfFolder).onChange(async (v) => {
					s.pdfFolder = v.trim() ? normalizePath(v.trim()) : "";
					await this.plugin.saveSettings();
					this.plugin.rescan();
				})
			);
		new Setting(this.containerEl)
			.setName(t.settingNotesFolder)
			.setDesc(t.settingNotesFolderDesc)
			.addText((text) =>
				text.setValue(s.notesFolder).onChange(async (v) => {
					s.notesFolder = v.trim() ? normalizePath(v.trim()) : "";
					await this.plugin.saveSettings();
				})
			);
		new Setting(this.containerEl)
			.setName(t.settingAutoImport)
			.setDesc(t.settingAutoImportDesc)
			.addToggle((toggle) =>
				toggle.setValue(s.autoImport).onChange(async (v) => {
					s.autoImport = v;
					await this.plugin.saveSettings();
					this.plugin.rescan();
				})
			);
	}
}
