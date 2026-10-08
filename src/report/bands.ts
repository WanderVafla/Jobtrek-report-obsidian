export type Band = "good" | "warn" | "bad";

export const gradeBand = (g: number): Band => (g < 4.6 ? "bad" : g < 5.15 ? "warn" : "good");
export const scoreBand = (v: number): Band => (v < 4.3 ? "bad" : v <= 4.8 ? "warn" : "good");
