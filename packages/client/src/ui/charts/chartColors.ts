export const CHART_COLORS: string[] = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const FALLBACK_COLOR = "var(--chart-1)";

export function seriesColor(explicit: string | undefined, index: number): string {
	return explicit ?? CHART_COLORS[index % CHART_COLORS.length] ?? FALLBACK_COLOR;
}
