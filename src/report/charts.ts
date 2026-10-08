import { Chart, registerables } from "chart.js";
import * as constants from "../constants";
import { ReportStrings } from "../i18n";
import { gradeBand, scoreBand } from "./bands";
import { Aggregation, Evaluation, RankedCategory } from "./data";
import { ThemeColors } from "./theme";

Chart.register(...registerables);

/** Перенос длинного названия проекта по словам: повёрнутая подпись съедает место слева от графика. */
function wrapLabel(text: string, max = constants.AXIS_LABEL_WRAP_CHARS): string[] {
	const lines: string[] = [];
	for (const word of text.split(/\s+/)) {
		const last = lines[lines.length - 1];
		if (last && last.length + 1 + word.length <= max) lines[lines.length - 1] = `${last} ${word}`;
		else lines.push(word);
	}
	return lines;
}

function chartBox(parent: HTMLElement, tall = false): HTMLCanvasElement {
	const box = parent.createDiv({ cls: tall ? constants.CSS_CLASSES.chartBoxTall : constants.CSS_CLASSES.chartBox });
	return box.createEl("canvas");
}

/** График 1: итоговый % от максимума по проектам. */
export function trendChart(parent: HTMLElement, evals: Evaluation[], col: ThemeColors, t: ReportStrings): Chart {
	const pcts = evals.map((e) => (e.max ? (e.points / e.max) * 100 : 0));
	return new Chart(chartBox(parent), {
		type: constants.CHART_TYPE_LINE,
		data: {
			labels: evals.map((e) => wrapLabel(e.project)),
			datasets: [
				{
					label: t.trendDatasetLabel,
					data: pcts,
					borderColor: col.accent,
					backgroundColor: col.accent,
					pointBackgroundColor: evals.map((e) => col[gradeBand(e.grade)]),
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
					grid: { color: col.grid },
					ticks: { callback: (val) => `${val}${constants.PERCENT_SUFFIX}` },
				},
				x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } },
			},
		},
	});
}

/** График 2: средневзвешенная оценка по категориям. */
export function categoriesChart(parent: HTMLElement, ranked: RankedCategory[], col: ThemeColors, t: ReportStrings): Chart {
	return new Chart(chartBox(parent, true), {
		type: constants.CHART_TYPE_BAR,
		data: {
			labels: ranked.map((r) => t.catLabels[r.key] ?? r.key),
			datasets: [
				{
					data: ranked.map((r) => Number(r.value.toFixed(2))),
					backgroundColor: ranked.map((r) => col[scoreBand(r.value)]),
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
			scales: { x: { min: 0, max: 6, grid: { color: col.grid } }, y: { grid: { display: false } } },
		},
	});
}

/** График 3: самые слабые категории проект за проектом; пропуски соединяются пунктиром. */
export function recurringChart(
	parent: HTMLElement,
	evals: Evaluation[],
	candidates: RankedCategory[],
	perProject: Aggregation["perProject"],
	col: ThemeColors,
	t: ReportStrings
): Chart {
	const palette = [col.bad, col.accent, col.warn, col.good];
	return new Chart(chartBox(parent, true), {
		type: constants.CHART_TYPE_LINE,
		data: {
			labels: evals.map((e) => wrapLabel(e.project)),
			datasets: candidates.map((c, i) => ({
				label: t.catLabels[c.key] ?? c.key,
				data: perProject.map((p) => p[c.key] ?? null),
				borderColor: palette[i],
				backgroundColor: palette[i],
				tension: 0.2,
				spanGaps: true,
				segment: {
					borderDash: (ctx) => (ctx.p0.skip || ctx.p1.skip ? [6, 6] : undefined),
				},
			})),
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { position: constants.CHART_LEGEND_POSITION_BOTTOM, labels: { boxWidth: 10, boxHeight: 10 } } },
			scales: {
				y: { min: 2, max: 6, grid: { color: col.grid } },
				x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false } },
			},
		},
	});
}
