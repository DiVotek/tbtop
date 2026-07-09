import { type ColumnsSpec, resolveColumnsClass } from "../structure/columnsSpec";
import type { StructureNode } from "../structure/structure";
import { type IconDef, NodeIcon } from "../ui/node-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { RenderProps } from "./blockRegistry";
import { mapChildren } from "./mapChildren";

// SectionBlock lives in its own module (variant dispatch grew it past this
// file's budget); re-exported so existing importers keep working.
export { SectionBlock } from "./sectionBlock";

type JustifyValue = "start" | "center" | "end" | "between" | "around" | "evenly";
type AlignValue = "start" | "center" | "end" | "stretch" | "baseline";

interface StackOptions {
	[key: string]: unknown;
}

interface RowOptions {
	variant?: "grid";
	[key: string]: unknown;
}

interface GridOptions {
	cols?: ColumnsSpec;
}

interface TabsOptions {
	tabs: { label: string; body: StructureNode; icon?: IconDef; badge?: string }[];
}

interface WidgetOptions {
	component: React.ComponentType<Record<string, unknown>>;
	props?: Record<string, unknown>;
}

// Static class maps — Tailwind only emits classes it sees verbatim in source.
// Never build class names by string interpolation; purge will silently drop them.

const JUSTIFY: Record<JustifyValue, string> = {
	start: "justify-start",
	center: "justify-center",
	end: "justify-end",
	between: "justify-between",
	around: "justify-around",
	evenly: "justify-evenly",
};

const ALIGN: Record<AlignValue, string> = {
	start: "items-start",
	center: "items-center",
	end: "items-end",
	stretch: "items-stretch",
	baseline: "items-baseline",
};

const GAP: Record<number, string> = {
	0: "gap-0",
	1: "gap-1",
	2: "gap-2",
	3: "gap-3",
	4: "gap-4",
	5: "gap-5",
	6: "gap-6",
	7: "gap-7",
	8: "gap-8",
	9: "gap-9",
	10: "gap-10",
	11: "gap-11",
	12: "gap-12",
};

export function StackBlock({ children, renderChild }: RenderProps<StackOptions>) {
	return <div className="flex flex-col gap-4">{mapChildren(children, renderChild)}</div>;
}

export function RowBlock({ options, children, renderChild }: RenderProps<RowOptions>) {
	if (options.variant === "grid") {
		return (
			<div
				className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
				data-testid="row-grid"
			>
				{(children ?? []).map((child, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
						key={i}
						className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/50 hover:bg-muted/40"
						data-testid="row-grid-item"
					>
						{renderChild(child)}
					</div>
				))}
			</div>
		);
	}
	return <div className="flex flex-row gap-2">{mapChildren(children, renderChild)}</div>;
}

interface FlexBlockOptions {
	direction: "row" | "col";
	justify?: JustifyValue;
	align?: AlignValue;
	gap?: number;
	wrap?: boolean;
	[key: string]: unknown;
}

export function FlexBlock({ options, children, renderChild }: RenderProps<FlexBlockOptions>) {
	const dir = options.direction === "col" ? "flex-col" : "flex-row";
	const defaultGap = options.direction === "col" ? "gap-4" : "gap-2";
	const justify = options.justify != null ? (JUSTIFY[options.justify] ?? "") : "";
	const align = options.align != null ? (ALIGN[options.align] ?? "") : "";
	const gap = options.gap != null ? (GAP[options.gap] ?? defaultGap) : defaultGap;
	const wrap = options.wrap ? "flex-wrap" : "";
	const className = ["flex", dir, justify, align, gap, wrap].filter(Boolean).join(" ");
	return <div className={className}>{mapChildren(children, renderChild)}</div>;
}

export function GridBlock({ options, children, renderChild }: RenderProps<GridOptions>) {
	return (
		<div className={`grid gap-4 ${resolveColumnsClass(options.cols)}`}>
			{mapChildren(children, renderChild)}
		</div>
	);
}

export function TabsBlock({ options, renderChild }: RenderProps<TabsOptions>) {
	if (options.tabs.length === 0) {
		return null;
	}
	return (
		<Tabs defaultValue="0" data-testid="tabs">
			<TabsList>
				{options.tabs.map((tab, i) => {
					const icon = <NodeIcon icon={tab.icon} className="size-4 shrink-0" />;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: tab positions are stable
						<TabsTrigger key={i} value={String(i)} data-testid={`tab-${tab.label}`}>
							{tab.icon?.position !== "right" && icon}
							{tab.label}
							{tab.icon?.position === "right" && icon}
							{tab.badge !== undefined && (
								<span
									className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-[10px] tabular-nums"
									data-testid={`tab-badge-${tab.label}`}
								>
									{tab.badge}
								</span>
							)}
						</TabsTrigger>
					);
				})}
			</TabsList>
			{options.tabs.map((tab, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: tab positions are stable
				<TabsContent key={i} value={String(i)} data-testid={`tab-panel-${tab.label}`}>
					{renderChild(tab.body)}
				</TabsContent>
			))}
		</Tabs>
	);
}

export function WidgetBlock({ options }: RenderProps<WidgetOptions>) {
	const Component = options.component;
	return <Component {...(options.props ?? {})} />;
}
