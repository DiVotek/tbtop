import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";
import { useChartColors } from "../../lib/useChartColors";
import { resolveColorClasses } from "../../structure/table/colorRegistry";
import { resolveIcon } from "../../structure/table/iconRegistry";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
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

const BOTTOM_SPARKLINE_HEIGHT = 36;

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
		<Card className={cn(bottomSparkline && "overflow-hidden")} data-testid="stat-card">
			<CardHeader>
				<StatHeader label={label} icon={icon} color={color} />
			</CardHeader>
			<CardContent className={cn(bottomSparkline && "pb-9")}>
				<p className="text-3xl font-bold tracking-tight">{String(value ?? "")}</p>
				{delta !== undefined && <DeltaBadge delta={delta} />}
				{description !== undefined && (
					<StatDescription
						text={description}
						color={options.descriptionColor}
						trend={options.trend}
					/>
				)}
				{hasSparkline && !bottomSparkline && (
					<div className="mt-3" data-testid="stat-sparkline">
						<Sparkline data={sparkline} color={sparklineColor} />
					</div>
				)}
			</CardContent>
			{bottomSparkline && <BottomSparkline data={sparkline} color={sparklineColor} />}
		</Card>
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
		<div className="flex items-center gap-1.5">
			{Icon !== undefined && (
				<Icon className={`h-4 w-4 ${colorClasses?.text ?? "text-muted-foreground"}`} />
			)}
			<CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{label}
			</CardTitle>
		</div>
	);
}

interface BottomSparklineProps {
	data: number[];
	color: string | undefined;
}

// Negative margins punch through Card's py-6/px-6 padding so the sparkline
// reaches the actual edges; Card's overflow-hidden clips it to the rounded corners.
function BottomSparkline({ data, color }: BottomSparklineProps) {
	return (
		<div
			className="pointer-events-none -mx-6 -mb-6 mt-2"
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
			className={`mt-1 flex items-center gap-1 text-sm font-medium ${colorClass}`}
			data-testid="stat-delta"
			data-direction={delta.direction}
		>
			<DeltaIcon className="h-4 w-4" aria-hidden="true" />
			{delta.text}
		</span>
	);
}
