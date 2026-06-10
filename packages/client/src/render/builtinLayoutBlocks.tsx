import { Fragment, type ReactNode } from "react";
import type { StructureNode } from "../structure/structure";
import type { RenderProps } from "./blockRegistry";

interface StackOptions {
	[key: string]: unknown;
}

interface RowOptions {
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

export function StackBlock({ children, renderChild }: RenderProps<StackOptions>) {
	return <div className="flex flex-col gap-4">{mapChildren(children, renderChild)}</div>;
}

export function RowBlock({ children, renderChild }: RenderProps<RowOptions>) {
	return <div className="flex flex-row gap-2">{mapChildren(children, renderChild)}</div>;
}

// Static class map — Tailwind only emits classes it sees verbatim in source.
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
