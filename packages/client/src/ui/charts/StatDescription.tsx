import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";

export type DescriptionColor = "success" | "warning" | "danger";
export type TrendDirection = "up" | "down";

const DESCRIPTION_COLORS: Record<DescriptionColor, string> = {
	success: "text-emerald-700 dark:text-emerald-400",
	warning: "text-amber-700 dark:text-amber-400",
	danger: "text-red-700 dark:text-red-400",
};

const TREND_ICONS: Record<TrendDirection, React.ElementType> = {
	up: TrendingUp,
	down: TrendingDown,
};

interface StatDescriptionProps {
	text: string;
	color?: DescriptionColor;
	trend?: TrendDirection;
}

/** Colored subtitle with an optional trend arrow that inherits its color. */
export function StatDescription({ text, color, trend }: StatDescriptionProps) {
	const TrendIcon = trend !== undefined ? TREND_ICONS[trend] : undefined;
	return (
		<div
			className="flex items-center gap-1 text-xs"
			data-testid="stat-description"
			data-color={color}
		>
			<span
				className={cn(
					"font-medium",
					color ? DESCRIPTION_COLORS[color] : "text-muted-foreground",
				)}
			>
				{text}
			</span>
			{TrendIcon !== undefined && (
				<TrendIcon
					className="h-3.5 w-3.5 shrink-0"
					aria-hidden="true"
					data-testid="stat-trend"
					data-direction={trend}
				/>
			)}
		</div>
	);
}
