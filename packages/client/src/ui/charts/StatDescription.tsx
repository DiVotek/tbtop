import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { CardDescription } from "../card";

export type DescriptionColor = "success" | "warning" | "danger";
export type TrendDirection = "up" | "down";

const DESCRIPTION_COLORS: Record<DescriptionColor, string> = {
	success: "text-emerald-600 dark:text-emerald-400",
	warning: "text-amber-600 dark:text-amber-400",
	danger: "text-red-600 dark:text-red-400",
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
		<CardDescription
			className={cn("mt-1 flex items-center gap-1", color && DESCRIPTION_COLORS[color])}
			data-testid="stat-description"
			data-color={color}
		>
			{text}
			{TrendIcon !== undefined && (
				<TrendIcon
					className="h-3.5 w-3.5 shrink-0"
					aria-hidden="true"
					data-testid="stat-trend"
					data-direction={trend}
				/>
			)}
		</CardDescription>
	);
}
