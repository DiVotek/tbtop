/**
 * Progress — determinate bar (shadcn-style). Outer track + inner fill whose
 * width tracks `value` (0-100). No Radix dependency.
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
			className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
		>
			<div
				className="h-full rounded-full bg-primary transition-all"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}
