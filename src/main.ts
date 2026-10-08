import { Plugin, TFile } from "obsidian";
import * as constants from "./constants";
import { Lang, getStrings, normalizeLang } from "./i18n";
import { PdfImporter } from "./import/importer";
import { ReportView } from "./report/view";
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
