/**
 * Progress — determinate bar (shadcn-style). Outer track + inner fill whose
 * width tracks `value` (0-100). No Radix dependency.
 *
 * New-gen shape: track/fill colors and height come from `cn-progress` /
 * `cn-progress-indicator` in `ui/presets/style-preset-*.css`. Delta: no Radix
 * Progress primitive, so the fill is sized by `width` instead of upstream's
 * translateX on a full-width indicator, and the value is clamped here.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface ProgressProps {
	value: number;
	className?: string;
}

function clampPercent(value: number): number {
	if (value < 0) {
		return 0;
	}
	if (value > 100) {
		return 100;
	}
	return value;
}

export function Progress({ value, className }: ProgressProps): ReactNode {
	const pct = clampPercent(value);
	return (
		<div
			role="progressbar"
			aria-valuenow={pct}
			aria-valuemin={0}
			aria-valuemax={100}
			data-slot="progress"
			className={cn(
				"cn-progress relative flex w-full items-center overflow-x-hidden",
				className,
			)}
		>
			<div
				data-slot="progress-indicator"
				className="cn-progress-indicator h-full rounded-full transition-all"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}
