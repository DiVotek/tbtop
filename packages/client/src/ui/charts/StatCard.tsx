import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { useChartColors } from "../../lib/useChartColors";
import { resolveColorClasses } from "../../structure/table/colorRegistry";
import { resolveIcon } from "../../structure/table/iconRegistry";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import { Sparkline } from "./Sparkline";
import { type DescriptionColor, StatDescription, type TrendDirection } from "./StatDescription";

type DeltaDirection = "up" | "down" | "flat";

interface DeltaInfo {
	text: string;
	direction: DeltaDirection;
}

/** 'inline' (default) sits under the card content; 'bottom' pins full-bleed to the card's bottom edge. */
type SparklinePosition = "inline" | "bottom";

type SparklineColorToken = "success" | "warning" | "danger" | "primary";

export interface StatDescriptor {
	label: string;
	value: unknown;
	description?: string;
	descriptionColor?: DescriptionColor;
	trend?: TrendDirection;
	delta?: DeltaInfo;
	icon?: { name: string; position: string };
	tooltip?: string;
	color?: string;
	sparkline?: number[];
	sparklinePosition?: SparklinePosition;
	sparklineColor?: SparklineColorToken;
}

const DELTA_ICONS: Record<DeltaDirection, React.ElementType> = {
	up: TrendingUp,
	down: TrendingDown,
	flat: Minus,
};

const DELTA_COLORS: Record<DeltaDirection, string> = {
	up: "text-success",
	down: "text-destructive",
	flat: "text-muted-foreground",
};

// Concrete values — recharts needs a paintable color, not a class name.
const SPARKLINE_COLORS: Record<SparklineColorToken, string> = {
	success: "#10b981", // emerald-500
	warning: "#f59e0b", // amber-500
	danger: "#ef4444", // red-500
	primary: "var(--primary)",
};

const BOTTOM_SPARKLINE_HEIGHT = 32;

/** Semantic token → paintable sparkline color; undefined token keeps the chart default. */
export function resolveSparklineColor(
	token: SparklineColorToken | undefined,
	fallback: string | undefined,
): string | undefined {
	return token !== undefined ? SPARKLINE_COLORS[token] : fallback;
}

interface StatCardProps {
	options: StatDescriptor;
}

export function StatCard({ options }: StatCardProps) {
	const { label, value, description, delta, icon, tooltip, color, sparkline } = options;
	const hasSparkline = sparkline !== undefined && sparkline.length > 0;
	const bottomSparkline = hasSparkline && (options.sparklinePosition ?? "inline") === "bottom";
	const sparklineColor = resolveSparklineColor(options.sparklineColor, useChartColors()[0]);

	const card = (
		<div
			className={cn(
				"group relative flex flex-col items-start gap-1 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50",
				bottomSparkline && "overflow-hidden pb-10",
			)}
			data-testid="stat-card"
		>
			<StatHeader label={label} icon={icon} color={color} />
			<div className="text-3xl font-semibold tracking-tight">{String(value ?? "")}</div>
			{delta !== undefined && <DeltaBadge delta={delta} />}
			{description !== undefined && (
				<StatDescription
					text={description}
					color={options.descriptionColor}
					trend={options.trend}
				/>
			)}
			{hasSparkline && !bottomSparkline && (
				<div className="mt-3 w-full" data-testid="stat-sparkline">
					<Sparkline data={sparkline} color={sparklineColor} />
				</div>
			)}
			{bottomSparkline && <BottomSparkline data={sparkline} color={sparklineColor} />}
		</div>
	);

	if (tooltip) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{card}</TooltipTrigger>
				<TooltipContent>{tooltip}</TooltipContent>
			</Tooltip>
		);
	}

	return card;
}

interface StatHeaderProps {
	label: string;
	icon?: { name: string; position: string };
	color?: string;
}

function StatHeader({ label, icon, color }: StatHeaderProps) {
	const Icon = icon ? resolveIcon(icon.name) : undefined;
	const colorClasses = color ? resolveColorClasses(color) : undefined;
	return (
		<div className="flex w-full items-center justify-between text-muted-foreground">
			<span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
				{Icon !== undefined && (
					<Icon
						className={cn("h-4 w-4", colorClasses?.text ?? "text-muted-foreground")}
					/>
				)}
				{label}
			</span>
		</div>
	);
}

interface BottomSparklineProps {
	data: number[];
	color: string | undefined;
}

// Absolute overlay pinned to the card's bottom edge — not in the flow, so it
// never pushes the card's natural height. The card's overflow-hidden clips it
// to the rounded corners (rounded-b-lg is inherited from that clip).
function BottomSparkline({ data, color }: BottomSparklineProps) {
	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 h-8 overflow-hidden"
			data-testid="stat-sparkline"
			data-position="bottom"
		>
			<Sparkline data={data} color={color} height={BOTTOM_SPARKLINE_HEIGHT} />
		</div>
	);
}

function DeltaBadge({ delta }: { delta: DeltaInfo }) {
	const DeltaIcon = DELTA_ICONS[delta.direction] ?? Minus;
	const colorClass = DELTA_COLORS[delta.direction] ?? "text-muted-foreground";

	return (
		<span
			className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}
			data-testid="stat-delta"
			data-direction={delta.direction}
		>
			<DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
			{delta.text}
		</span>
	);
}
