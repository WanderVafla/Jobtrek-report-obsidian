import { App } from "obsidian";
import * as constants from "../constants";

export interface Criterion {
	name: string;
	weight: number;
	grade: number;
	category: string;
}

export interface Evaluation {
	project: string;
	date: string;
	stack: string;
	grade: number;
	points: number;
	max: number;
	note: string;
	criteria: Criterion[];
}

export interface RankedCategory {
	key: string;
	value: number;
}

export interface Aggregation {
	/** Категории по средневзвешенной оценке, от худшей к лучшей. */
	ranked: RankedCategory[];
	/** Средневзвешенная оценка категории в каждом проекте. */
	perProject: Record<string, Record<string, number | null>>;
}

export function parseCriteria(text: string): Criterion[] {
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

/** Все заметки с `type: jobtrek-evaluation`, по дате. */
export async function loadEvaluations(app: App): Promise<Evaluation[]> {
	const list: Evaluation[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm || fm.type !== constants.FRONTMATTER_EVALUATION_TYPE) continue;
		const criteria = parseCriteria(await app.vault.cachedRead(file));
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

export function aggregate(evals: Evaluation[]): Aggregation {
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
	return { ranked, perProject };
}
