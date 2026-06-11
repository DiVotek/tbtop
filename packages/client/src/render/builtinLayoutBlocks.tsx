import { Fragment, type ReactNode } from "react";
import type { StructureNode } from "../structure/structure";
import type { RenderProps } from "./blockRegistry";

type JustifyValue = "start" | "center" | "end" | "between" | "around" | "evenly";
type AlignValue = "start" | "center" | "end" | "stretch" | "baseline";

interface FlexOptions {
	justify?: JustifyValue;
	align?: AlignValue;
	gap?: number;
	wrap?: boolean;
}

interface StackOptions extends FlexOptions {
	[key: string]: unknown;
}

interface RowOptions extends FlexOptions {
	[key: string]: unknown;
}

interface GridOptions {
	cols: number;
}

interface SectionOptions {
	title?: string;
}

interface TabsOptions {
	tabs: { label: string; body: StructureNode }[];
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

function flexClasses(base: string, defaultGap: string, opts: FlexOptions): string {
	const justify = opts.justify != null ? (JUSTIFY[opts.justify] ?? "") : "";
	const align = opts.align != null ? (ALIGN[opts.align] ?? "") : "";
	const gap = opts.gap != null ? (GAP[opts.gap] ?? defaultGap) : defaultGap;
	const wrap = opts.wrap ? "flex-wrap" : "";
	return [base, justify, align, gap, wrap].filter(Boolean).join(" ");
}

export function StackBlock({ options, children, renderChild }: RenderProps<StackOptions>) {
	return (
		<div className={flexClasses("flex flex-col", "gap-4", options)}>
			{mapChildren(children, renderChild)}
		</div>
	);
}

export function RowBlock({ options, children, renderChild }: RenderProps<RowOptions>) {
	return (
		<div className={flexClasses("flex flex-row", "gap-2", options)}>
			{mapChildren(children, renderChild)}
		</div>
	);
}

const GRID_COLS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
};

export function GridBlock({ options, children, renderChild }: RenderProps<GridOptions>) {
	return (
		<div className={`grid gap-4 ${GRID_COLS[options.cols] ?? "grid-cols-1"}`}>
			{mapChildren(children, renderChild)}
		</div>
	);
}

export function SectionBlock({ options, children, renderChild }: RenderProps<SectionOptions>) {
	return (
		<section className="flex flex-col gap-3">
			{options.title && <h2 className="text-lg font-semibold">{options.title}</h2>}
			{mapChildren(children, renderChild)}
		</section>
	);
}

export function TabsBlock({ options, renderChild }: RenderProps<TabsOptions>) {
	return (
		<div className="flex flex-col gap-3" data-testid="tabs">
			{options.tabs.map((tab, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: tab positions are stable
				<div key={i} data-testid={`tab-${tab.label}`}>
					<h3 className="text-sm font-medium">{tab.label}</h3>
					{renderChild(tab.body)}
				</div>
			))}
		</div>
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
