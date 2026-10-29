import { cn } from "../lib/cn";
import { resolveColorClasses } from "../structure/table/colorRegistry";

/** `tbtop.environment` shared prop, mirrors PanelConfig::getEnvironmentIndicator(). */
export interface EnvironmentIndicatorData {
	label: string;
	/** Badge color name from the table color registry (success, warning, danger, …). */
	color: string;
}

/** Header badge naming the app environment, e.g. "Staging". */
export function EnvironmentBadge({ indicator }: { indicator: EnvironmentIndicatorData }) {
	const classes = resolveColorClasses(indicator.color);
	return (
		<span
			data-testid="environment-badge"
			className={cn(
				"inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-medium text-xs",
				classes.bg,
				classes.text,
			)}
		>
			{indicator.label}
		</span>
	);
}

/** Thin colored strip along the top edge of the viewport, above every shell frame. */
export function EnvironmentStrip({ indicator }: { indicator: EnvironmentIndicatorData }) {
	return (
		<div
			aria-hidden
			data-testid="environment-strip"
			className={cn(
				"pointer-events-none fixed inset-x-0 top-0 z-50 h-1",
				resolveColorClasses(indicator.color).bg,
			)}
		/>
	);
}
