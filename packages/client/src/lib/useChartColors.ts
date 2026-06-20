import { useEffect, useState } from "react";
import { CHART_COLORS } from "../ui/charts/chartColors";

const CHART_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];

function canResolve(): boolean {
	return typeof window !== "undefined" && typeof window.getComputedStyle === "function";
}

function resolveChartColors(): string[] {
	if (!canResolve()) {
		return CHART_COLORS;
	}
	const styles = window.getComputedStyle(document.documentElement);
	return CHART_VARS.map((name, i) => {
		const resolved = styles.getPropertyValue(name).trim();
		return resolved || (CHART_COLORS[i] ?? CHART_COLORS[0] ?? "");
	});
}

// Reads the resolved --chart-N tokens and re-resolves whenever the theme flips.
// The app signals theme by toggling `.dark` on <html> (ProfileDropdown), so a
// class MutationObserver on documentElement is the only signal to watch.
export function useChartColors(): string[] {
	const [colors, setColors] = useState<string[]>(CHART_COLORS);

	useEffect(() => {
		if (!canResolve()) {
			return;
		}
		setColors(resolveChartColors());
		const root = document.documentElement;
		const observer = new MutationObserver(() => setColors(resolveChartColors()));
		observer.observe(root, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	return colors;
}
