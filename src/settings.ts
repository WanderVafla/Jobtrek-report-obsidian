import { App, PluginSettingTab, Setting, normalizePath } from "obsidian";
import * as constants from "./constants";
import { Lang, normalizeLang } from "./i18n";
import type JobtrekReportPlugin from "./main";

export interface JobtrekReportSettings {
	lang: Lang;
	/** Папка, за которой следит автоимпорт PDF. Пусто: автоимпорт выключен. */
	pdfFolder: string;
	/** Куда класть созданные заметки. Пусто: рядом с PDF. */
	notesFolder: string;
	autoImport: boolean;
}

export const DEFAULT_SETTINGS: JobtrekReportSettings = { lang: "ru", pdfFolder: "", notesFolder: "", autoImport: true };

/** data.json → настройки: неизвестные и битые поля заменяются значениями по умолчанию. */
export function normalizeSettings(data: unknown): JobtrekReportSettings {
	const d = (data ?? {}) as Partial<Record<keyof JobtrekReportSettings, unknown>>;
	const str = (v: unknown, fb: string) => (typeof v === "string" ? v : fb);
	return {
		lang: normalizeLang(d.lang),
		pdfFolder: str(d.pdfFolder, DEFAULT_SETTINGS.pdfFolder),
		notesFolder: str(d.notesFolder, DEFAULT_SETTINGS.notesFolder),
		autoImport: typeof d.autoImport === "boolean" ? d.autoImport : DEFAULT_SETTINGS.autoImport,
	};
}

export class JobtrekSettingTab extends PluginSettingTab {
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
					this.plugin.importer.rescan();
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
					this.plugin.importer.rescan();
				})
			);
	}
}
