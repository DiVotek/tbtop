import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { resolveColorClasses } from "../../structure/table/colorRegistry";
import { resolveIcon } from "../../structure/table/iconRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Sparkline } from "./Sparkline";

type DeltaDirection = "up" | "down" | "flat";

interface DeltaInfo {
	text: string;
	direction: DeltaDirection;
}

export interface StatDescriptor {
	label: string;
	value: unknown;
	description?: string;
	delta?: DeltaInfo;
	icon?: string;
	color?: string;
	sparkline?: number[];
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

interface StatCardProps {
	options: StatDescriptor;
}

export function StatCard({ options }: StatCardProps) {
	const { label, value, description, delta, icon, color, sparkline } = options;
	const Icon = icon ? resolveIcon(icon) : undefined;
	const colorClasses = color ? resolveColorClasses(color) : undefined;

	return (
		<Card data-testid="stat-card">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{label}
					</CardTitle>
					{Icon !== undefined && (
						<span
							className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClasses?.bg ?? "bg-muted"}`}
						>
							<Icon
								className={`h-4 w-4 ${colorClasses?.text ?? "text-muted-foreground"}`}
							/>
						</span>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold tracking-tight">{String(value ?? "")}</p>
				{delta !== undefined && <DeltaBadge delta={delta} />}
				{description !== undefined && (
					<CardDescription className="mt-1">{description}</CardDescription>
				)}
				{sparkline !== undefined && sparkline.length > 0 && (
					<div className="mt-3" data-testid="stat-sparkline">
						<Sparkline data={sparkline} />
					</div>
				)}
			</CardContent>
		</Card>
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
