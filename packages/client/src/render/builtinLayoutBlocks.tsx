import { Fragment, type ReactNode, useState } from "react";
import { type ColumnsSpec, resolveColumnsClass } from "../structure/columnsSpec";
import type { StructureNode } from "../structure/structure";
import { type IconDef, NodeIcon } from "../ui/node-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { RenderProps } from "./blockRegistry";
import { SectionHeader } from "./sectionHeader";

type JustifyValue = "start" | "center" | "end" | "between" | "around" | "evenly";
type AlignValue = "start" | "center" | "end" | "stretch" | "baseline";

interface StackOptions {
	[key: string]: unknown;
}

interface RowOptions {
	[key: string]: unknown;
}

interface GridOptions {
	cols?: ColumnsSpec;
}

interface SectionOptions {
	title?: string;
	description?: string;
	icon?: IconDef;
	aside?: StructureNode;
	action?: { label: string; url: string };
	collapsible?: boolean;
	collapsed?: boolean;
	columns?: ColumnsSpec;
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

export function RowBlock({ children, renderChild }: RenderProps<RowOptions>) {
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

export function SectionBlock({ options, children, renderChild }: RenderProps<SectionOptions>) {
	const [open, setOpen] = useState(!options.collapsed);
	const expanded = options.collapsible ? open : true;
	const bodyClass =
		options.columns != null
			? `grid gap-4 ${resolveColumnsClass(options.columns)}`
			: "flex flex-col gap-3";
	const body = expanded && <div className={bodyClass}>{mapChildren(children, renderChild)}</div>;
	return (
		<section className="flex flex-col gap-3" data-testid="section-block">
			<SectionHeader
				title={options.title}
				description={options.description}
				icon={options.icon}
				action={options.action}
				collapsible={options.collapsible}
				open={open}
				onToggle={() => setOpen((prev) => !prev)}
			/>
			{/* aside is a persistent context slot (actions/status) — it stays visible
			   even when collapsible hides the body; see docs/ai/authoring-pages.md */}
			{options.aside ? (
				<div className="flex flex-col gap-4 md:flex-row">
					<div className="min-w-0 flex-1">{body}</div>
					<div className="w-full shrink-0 md:w-64" data-testid="section-aside">
						{renderChild(options.aside)}
					</div>
				</div>
			) : (
				body
			)}
		</section>
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

function mapChildren(
	children: StructureNode[] | undefined,
	renderChild: (node: StructureNode) => ReactNode,
): ReactNode {
	if (!children) {
		return null;
	}
	return children.map((child, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
		<Fragment key={i}>{renderChild(child)}</Fragment>
	));
}
