// SSR fallback: var() strings resolve in CSS but NOT as SVG presentation
// attributes — the runtime palette comes from useChartColors().
export const CHART_COLORS: string[] = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const FALLBACK_COLOR = "var(--chart-1)";

export function seriesColor(
	explicit: string | undefined,
	index: number,
	colors: string[] = CHART_COLORS,
): string {
	if (explicit !== undefined) {
		return explicit;
	}
	const palette = colors.length > 0 ? colors : CHART_COLORS;
	return palette[index % palette.length] ?? FALLBACK_COLOR;
}
