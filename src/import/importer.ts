import { Notice, TAbstractFile, TFile, debounce, loadPdfJs, normalizePath } from "obsidian";
import * as constants from "../constants";
import type JobtrekReportPlugin from "../main";
import { buildNote, extractPdfText, noteFileName, parseEvaluation } from "./parser";

/** Импорт PDF-оценок в заметки: вручную, сканированием папки и по событию create. */
export class PdfImporter {
	/** PDF, которые сейчас импортируются: событие create и сканирование папки не должны создать дубль. */
	private importing = new Set<string>();
	/** Пересканировать папку после смены настроек (не на каждый символ в поле ввода). */
	readonly rescan = debounce(() => void this.scanFolder(), constants.RESCAN_DEBOUNCE_MS, true);

	constructor(private plugin: JobtrekReportPlugin) {}

	private get app() {
		return this.plugin.app;
	}

	private get settings() {
		return this.plugin.settings;
	}

	private inPdfFolder(file: TFile): boolean {
		const raw = this.settings.pdfFolder.trim();
		if (!raw) return false;
		const folder = normalizePath(raw);
		return folder === "/" || file.path.startsWith(folder + "/");
	}

	onFileCreated(file: TAbstractFile) {
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
		const t = this.plugin.getStrings();
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
		const t = this.plugin.getStrings();
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
		const t = this.plugin.getStrings();
		if (!this.settings.pdfFolder.trim()) {
			new Notice(t.pdfFolderNotSet);
			return;
		}
		new Notice(`${t.importAllDone} ${await this.importFolder()}`);
	}

	/** Автоимпорт PDF, которые уже лежат в папке (старт плагина, смена настроек). */
	async scanFolder() {
		if (!this.settings.autoImport || !this.settings.pdfFolder.trim()) return;
		const created = await this.importFolder();
		if (created > 0) new Notice(`${this.plugin.getStrings().importAllDone} ${created}`);
	}

	private async importFolder(): Promise<number> {
		const t = this.plugin.getStrings();
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
}
