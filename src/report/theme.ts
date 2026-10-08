import { Chart } from "chart.js";
import * as constants from "../constants";

export interface ThemeColors {
	good: string;
	warn: string;
	bad: string;
	accent: string;
	muted: string;
	grid: string;
}

/** Цвета из CSS-переменных текущей темы Obsidian, с фолбэками. */
export function readThemeColors(): ThemeColors {
	const css = getComputedStyle(document.body);
	const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
	return {
		good: v(constants.CSS_VARS.colorGreen, constants.COLOR_FALLBACKS.good),
		warn: v(constants.CSS_VARS.colorYellow, constants.COLOR_FALLBACKS.warn),
		bad: v(constants.CSS_VARS.colorRed, constants.COLOR_FALLBACKS.bad),
		accent: v(constants.CSS_VARS.accent, constants.COLOR_FALLBACKS.accent),
		muted: v(constants.CSS_VARS.textMuted, constants.COLOR_FALLBACKS.muted),
		grid: v(constants.CSS_VARS.border, constants.COLOR_FALLBACKS.grid),
	};
}

export function applyChartDefaults(colors: ThemeColors) {
	Chart.defaults.color = colors.muted;
	Chart.defaults.font.size = 12;
}
