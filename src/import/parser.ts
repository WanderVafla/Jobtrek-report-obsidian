// Импорт PDF-оценок Jobtrek: текст из pdf.js → критерии → markdown-заметка.
// Порт scripts/convert.py из скилла jobtrek-eval-to-md; логика и регексы те же.

export interface ParsedCriterion {
	name: string;
	weight: number;
	grade: number;
	category: string;
	comment: string;
	improve: string;
}

export interface ParsedHead {
	code: string;
	date: string;
	title: string;
	grade?: number;
	points?: number;
	max?: number;
	general: string;
}

export interface ParsedEvaluation {
	head: ParsedHead;
	criteria: ParsedCriterion[];
	problems: string[];
}

export const CATEGORIES = [
	"git", "commits", "docs", "tooling", "core", "validation",
	"architecture", "ui_ux", "type_safety", "security", "spec", "communication",
];

// Первое совпадение выигрывает. Порядок как в references/categories.md.
const RULES: Array<[string, string[]]> = [
	["commits", ["conventional commit"]],
	["git", ["github project", "pull request", "task tracking", "project tracking", "issues, branches"]],
	["docs", ["readme", "documentation"]],
	["tooling", ["build reproducib", "deployment", "formatting", "linting", "lints", "type checking", "pint"]],
	["security", ["sql injection", "xss", "password", "authentication", "front-end safety", "frontend safety", "session security"]],
	["spec", ["contract", "cli argument", "use()", "react 19"]],
	["core", ["crud", "operations", "persistence & serialization", "lifecycle", "sorting", "delete all",
		"sqlite schema", "database schema", "secondary features", "edit, and delete", "categories"]],
	["validation", ["authorization", "application startup", "error handling", "validation", "due dates", "overdue"]],
	["ui_ux", ["responsive", "accessib", "visual", "css", "html structure", "design"]],
	["type_safety", ["typescript", "type safety", "php fundamentals", "idioms"]],
	["architecture", ["architecture", "organization", "dead code", "state management", "separation of concerns", "cleanliness"]],
	["communication", ["presentation"]],
];

const MONTHS: Record<string, number> = {};
"january february march april may june july august september october november december"
	.split(" ").forEach((m, i) => (MONTHS[m] = i + 1));
"janvier février mars avril mai juin juillet août septembre octobre novembre décembre"
	.split(" ").forEach((m, i) => (MONTHS[m] = i + 1));

const NUM = String.raw`\d+(?:\.\d+)?`;
const NEW_ROW = new RegExp(String.raw`^(\d+)\.\s+(.+?)\s+((?:[a-z]\d+\.\d+(?:,\s*)?)+)\s+(${NUM})\s+(${NUM})\s*$`);
const OLD_WEIGHT = new RegExp(String.raw`Pondération\s+(${NUM})\s+Objectifs ICT évalués\s+(.*?)\s*Points obtenus\s+(${NUM})`);
const OLD_TITLE = /^(\d+)\s+(.+)$/;
const END_MARK = /^\d+\s+(Strengths and improvement areas|Commentaire général|Points forts)/i;

interface PdfTextItem {
	str?: string;
	transform?: number[];
}

/** Текст PDF построчно: элементы pdf.js группируются по y, внутри строки сортируются по x. */
export async function extractPdfText(pdfjs: any, data: ArrayBuffer): Promise<string> {
	const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
	const pages: string[] = [];
	try {
		for (let p = 1; p <= doc.numPages; p++) {
			const content = await (await doc.getPage(p)).getTextContent();
			const lines: Array<{ y: number; items: Array<{ x: number; s: string }> }> = [];
			for (const it of content.items as PdfTextItem[]) {
				if (!it.str || !it.transform || !it.str.trim()) continue;
				const x = it.transform[4];
				const y = it.transform[5];
				let line = lines.find((l) => Math.abs(l.y - y) < 2);
				if (!line) {
					line = { y, items: [] };
					lines.push(line);
				}
				line.items.push({ x, s: it.str });
			}
			lines.sort((a, b) => b.y - a.y);
			pages.push(
				lines
					.map((l) => l.items.sort((a, b) => a.x - b.x).map((i) => i.s.trim()).join(" "))
					.join("\n")
			);
		}
	} finally {
		await doc.destroy();
	}
	return pages.join("\n");
}

function isBoiler(line: string): boolean {
	const l = line.trim();
	return (
		!l ||
		l.toLowerCase().includes("jobtrek.ch") ||
		l.startsWith("FONDATION JOBTREK") ||
		l.startsWith("Centre de formation") ||
		/^Page \d+ sur \d+/.test(l) ||
		/^JT_DEV_E\d/.test(l)
	);
}

export function categorize(name: string): string {
	const n = name.toLowerCase();
	for (const [cat, keys] of RULES) {
		if (keys.some((k) => n.includes(k))) return cat;
	}
	return "unknown";
}

function parseDate(text: string): string {
	let m = /Date\s+(\d{4}-\d{2}-\d{2})/.exec(text);
	if (m) return m[1];
	m = /Date\s+(\d{1,2})\s+([A-Za-zéûè]+)\s+(\d{4})/.exec(text);
	const month = m ? MONTHS[m[2].toLowerCase()] : undefined;
	if (m && month) return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
	return "";
}

function cleanBlock(lines: string[]): string {
	return lines
		.filter((l) => !isBoiler(l))
		.map((l) => l.trim())
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

export function parseEvaluation(text: string): ParsedEvaluation {
	const lines = text.split(/\r?\n/);
	const head: ParsedHead = { code: "", date: parseDate(text), title: "", general: "" };
	const code = /(?:Project|Projet)\s+(JT_DEV_\w+)/.exec(text);
	if (code) head.code = code[1];
	const total = new RegExp(String.raw`(?:Final grade|Note)\s+(${NUM})\s+(${NUM})/(${NUM})`).exec(text);
	if (total) {
		head.grade = parseFloat(total[1]);
		head.points = parseFloat(total[2]);
		head.max = parseFloat(total[3]);
	}
	for (const l of lines) {
		const mm = /^Evaluation(?: de projet)?\s*-\s*(.+)$/.exec(l.trim());
		if (mm && !l.toLowerCase().includes("jobtrek.ch")) {
			head.title = mm[1].trim();
			break;
		}
	}

	const raw: Array<{ name: string; weight: number; grade: number; body: string[] }> = [];
	let cur: (typeof raw)[number] | null = null;
	const old = text.includes("Pondération");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (END_MARK.test(line)) break;
		let row: [string, number, number] | null = null;
		if (old) {
			const mt = OLD_TITLE.exec(line);
			if (mt && i + 1 < lines.length) {
				let mw = OLD_WEIGHT.exec(lines[i + 1]);
				if (!mw && i + 2 < lines.length) mw = OLD_WEIGHT.exec(lines[i + 1] + " " + lines[i + 2]);
				if (mw) {
					row = [mt[2].trim(), parseFloat(mw[1]), parseFloat(mw[3])];
					i += 1;
				}
			}
		} else if (/^\d+\.\s/.test(line)) {
			let cand = line;
			for (let extra = 0; extra < 3; extra++) {
				const mm = NEW_ROW.exec(cand);
				if (mm) {
					row = [mm[2].trim(), parseFloat(mm[4]), parseFloat(mm[5])];
					i += extra;
					break;
				}
				if (i + extra + 1 < lines.length) cand += " " + lines[i + extra + 1].trim();
			}
		}
		if (row) {
			cur = { name: row[0], weight: row[1], grade: row[2], body: [] };
			raw.push(cur);
		} else if (cur) {
			cur.body.push(lines[i]);
		}
	}

	const criteria: ParsedCriterion[] = raw.map((c) => {
		const body = cleanBlock(c.body);
		const [comment, improve] = body.includes("To improve:") ? body.split(/To improve:(.*)/s) : [body, ""];
		return {
			name: c.name,
			weight: c.weight,
			grade: c.grade,
			category: categorize(c.name),
			comment: comment.trim().replace(/^Comment:\s*/, ""),
			improve: (improve ?? "").trim(),
		};
	});

	const mg = /(?:General comment and suggestions for next projects|Commentaire général)\s*([\s\S]*)/.exec(text);
	if (mg) head.general = cleanBlock(mg[1].split(/\r?\n/)).split(/\s*Points (?:forts|à améliorer)/)[0].trim();

	return { head, criteria, problems: verify(head, criteria) };
}

/** Арифметическая проверка: sum(w*6) = max, sum(w*g) = points; категории известны. */
function verify(head: ParsedHead, criteria: ParsedCriterion[]): string[] {
	const problems: string[] = [];
	if (criteria.length === 0) problems.push("no criteria parsed");
	const sumW = criteria.reduce((s, c) => s + c.weight, 0);
	const sumP = criteria.reduce((s, c) => s + c.weight * c.grade, 0);
	if (head.max !== undefined && head.points !== undefined) {
		if (Math.abs(sumW * 6 - head.max) > 0.01) problems.push(`weights*6=${fmt(sumW * 6)} != max ${fmt(head.max)}`);
		if (Math.abs(sumP - head.points) > 0.01) problems.push(`sum(w*g)=${fmt(sumP)} != points ${fmt(head.points)}`);
	} else {
		problems.push("final grade / points line not found");
	}
	const unknown = criteria.filter((c) => c.category === "unknown").map((c) => c.name);
	if (unknown.length) problems.push("unknown category: " + unknown.join("; "));
	return problems;
}

function firstSentence(s: string, limit = 200): string {
	const m = /^(.+?[.!?])(\s|$)/s.exec(s);
	return (m ? m[1] : s).slice(0, limit).trimEnd();
}

const q = (s: string) => JSON.stringify(s);
const fmt = (n: number) => String(Math.round(n * 100) / 100);

export function projectName(ev: ParsedEvaluation, fallback: string): string {
	return ev.head.title || fallback;
}

/** Имя файла заметки: `ДАТА Проект.md` без запрещённых символов. */
export function noteFileName(ev: ParsedEvaluation, fallback: string): string {
	const safe = projectName(ev, fallback).replace(/[\\/:*?"<>|]/g, "-");
	return `${ev.head.date || "undated"} ${safe}.md`;
}

export function buildNote(ev: ParsedEvaluation, fallback: string, sourceLink: string): string {
	const { head, criteria, problems } = ev;
	const project = projectName(ev, fallback);
	const sumW = criteria.reduce((s, c) => s + c.weight, 0);
	const sumP = criteria.reduce((s, c) => s + c.weight * c.grade, 0);
	const md = [
		"---",
		"type: jobtrek-evaluation",
		`project: ${q(project)}`,
		`code: ${head.code}`,
		`date: ${head.date}`,
		`stack: ""`,
		`grade: ${fmt(head.grade ?? 0)}`,
		`points: ${fmt(head.points ?? sumP)}`,
		`max: ${fmt(head.max ?? sumW * 6)}`,
		`note: ${q(head.general ? firstSentence(head.general) : "")}`,
		`source: ${q(sourceLink)}`,
	];
	if (problems.length) md.push("check: failed");
	md.push("---", "", `# ${project}`, "");
	if (problems.length) {
		md.push("> [!warning] Import check failed", ...problems.map((p) => `> - ${p}`), "");
	}
	md.push("| Критерий | Вес | Оценка | Категория |", "|---|---|---|---|");
	for (const c of criteria) {
		md.push(`| ${c.name.replace(/\|/g, "/")} | ${fmt(c.weight)} | ${fmt(c.grade)} | ${c.category} |`);
	}
	md.push("", "## Комментарии оценщика", "");
	for (const c of criteria) {
		let line = `- **${c.name}** (${fmt(c.grade)}/6): ${c.comment}`;
		if (c.improve) line += ` *To improve:* ${c.improve}`;
		md.push(line);
	}
	if (head.general) md.push("", "## Общий комментарий", "", head.general);
	return md.join("\n") + "\n";
}
