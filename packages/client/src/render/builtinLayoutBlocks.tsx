import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { type ColumnsSpec, resolveColumnsClass } from "../structure/columnsSpec";
import { collectFieldNames, countTabErrors, firstTabIndexWithError } from "../structure/fieldNames";
import { useNearestFormHandle } from "../structure/formContext";
import type { StructureNode } from "../structure/structure";
import { TriggerVariantProvider } from "../structure/triggerVariantContext";
import { Badge } from "../ui/badge";
import { type IconDef, NodeIcon } from "../ui/node-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { RenderProps } from "./blockRegistry";
import { mapChildren } from "./mapChildren";
import { persistTabsValue, seedTabsValue } from "./tabsUrlState";

// SectionBlock lives in its own module (variant dispatch grew it past this
// file's budget); re-exported so existing importers keep working.
export { SectionBlock } from "./sectionBlock";

type JustifyValue = "start" | "center" | "end" | "between" | "around" | "evenly";
type AlignValue = "start" | "center" | "end" | "stretch" | "baseline";

interface StackOptions {
	gap?: number;
	class?: string;
	[key: string]: unknown;
}

interface RowOptions {
	variant?: "grid";
	gap?: number;
	class?: string;
	[key: string]: unknown;
}

interface GridOptions {
	cols?: ColumnsSpec;
	gap?: number;
	class?: string;
}

interface TabsOptions {
	name?: string;
	tabs: { name?: string; label: string; body: StructureNode; icon?: IconDef; badge?: string }[];
}

interface WidgetOptions {
	component: React.ComponentType<Record<string, unknown>>;
	props?: Record<string, unknown>;
}

/** Stable reference for "no form controller" — see useTabErrorAutoSwitch. */
const EMPTY_FIELD_ERRORS: Record<string, string> = {};

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

function resolveGap(gap: number | undefined, defaultGap: string): string {
	return gap != null ? (GAP[gap] ?? defaultGap) : defaultGap;
}

export function StackBlock({ options, children, renderChild }: RenderProps<StackOptions>) {
	const className = cn("flex flex-col", resolveGap(options.gap, "gap-4"), options.class);
	return <div className={className}>{mapChildren(children, renderChild)}</div>;
}

export function RowBlock({ options, children, renderChild }: RenderProps<RowOptions>) {
	if (options.variant === "grid") {
		const className = cn(
			"grid grid-cols-2",
			resolveGap(options.gap, "gap-2"),
			"sm:grid-cols-3 lg:grid-cols-4",
			options.class,
		);
		return (
			<div className={className} data-testid="row-grid">
				{(children ?? []).map((child, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
						key={i}
						className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/50 hover:bg-muted/40"
						data-testid="row-grid-item"
					>
						<TriggerVariantProvider value="plain">
							{renderChild(child)}
						</TriggerVariantProvider>
					</div>
				))}
			</div>
		);
	}
	const className = cn("flex flex-row", resolveGap(options.gap, "gap-2"), options.class);
	return <div className={className}>{mapChildren(children, renderChild)}</div>;
}

interface FlexBlockOptions {
	direction: "row" | "col";
	justify?: JustifyValue;
	align?: AlignValue;
	gap?: number;
	wrap?: boolean;
	variant?: "card";
	class?: string;
	[key: string]: unknown;
}

export function FlexBlock({ options, children, renderChild }: RenderProps<FlexBlockOptions>) {
	const dir = options.direction === "col" ? "flex-col" : "flex-row";
	const defaultGap = options.direction === "col" ? "gap-4" : "gap-2";
	const justify = options.justify != null ? (JUSTIFY[options.justify] ?? "") : "";
	const align = options.align != null ? (ALIGN[options.align] ?? "") : "";
	const gap = options.gap != null ? (GAP[options.gap] ?? defaultGap) : defaultGap;
	const wrap = options.wrap ? "flex-wrap" : "";
	const card = options.variant === "card" ? "rounded-md border bg-card px-3 py-2" : "";
	const className = cn("flex", dir, justify, align, gap, wrap, card, options.class);
	return <div className={className}>{mapChildren(children, renderChild)}</div>;
}

export function GridBlock({ options, children, renderChild }: RenderProps<GridOptions>) {
	const gap = options.gap != null ? (GAP[options.gap] ?? "gap-4") : "gap-4";
	return (
		<div className={cn("grid", gap, resolveColumnsClass(options.cols), options.class)}>
			{mapChildren(children, renderChild)}
		</div>
	);
}

export function TabsBlock({ options, renderChild }: RenderProps<TabsOptions>) {
	const { name, tabs } = options;
	const values = tabs.map((tab, index) => tab.name ?? String(index));
	const defaultValue = values[0] ?? "0";
	const urlName = name && tabs.every((tab) => tab.name) ? name : undefined;
	const tabFieldNames = useTabFieldNames(tabs);
	const [active, setActive] = useState(() =>
		urlName ? (seedTabsValue(urlName, values) ?? defaultValue) : defaultValue,
	);
	const currentActive = values.includes(active)
		? active
		: ((urlName ? seedTabsValue(urlName, values) : undefined) ?? defaultValue);
	const activeIndex = Math.max(values.indexOf(currentActive), 0);
	const errorCounts = useTabErrorAutoSwitch({
		tabFieldNames,
		activeIndex,
		setActiveIndex: (index) => setActive(values[index] ?? defaultValue),
	});
	const currentSearch = typeof window === "undefined" ? "" : window.location.search;
	useEffect(() => {
		if (active !== currentActive) {
			setActive(currentActive);
		}
	}, [active, currentActive]);
	useEffect(() => {
		if (urlName) {
			persistTabsValue(urlName, currentActive, defaultValue);
		}
	}, [urlName, currentActive, defaultValue, currentSearch]);

	if (tabs.length === 0) {
		return null;
	}
	return (
		<Tabs value={currentActive} onValueChange={setActive} data-testid="tabs">
			<TabsList>
				{tabs.map((tab, i) => (
					<TabTrigger
						key={tab.name ?? i}
						value={values[i] ?? String(i)}
						tab={tab}
						errorCount={errorCounts[i] ?? 0}
					/>
				))}
			</TabsList>
			{tabs.map((tab, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: tab positions are stable
				<TabsContent
					key={tab.name ?? i}
					value={values[i] ?? String(i)}
					data-testid={`tab-panel-${tab.label}`}
				>
					{renderChild(tab.body)}
				</TabsContent>
			))}
		</Tabs>
	);
}

interface TabTriggerProps {
	value: string;
	tab: TabsOptions["tabs"][number];
	errorCount: number;
}

function TabTrigger({ value, tab, errorCount }: TabTriggerProps) {
	const icon = <NodeIcon icon={tab.icon} className="size-4 shrink-0" />;
	return (
		<TabsTrigger value={value} data-testid={`tab-${tab.label}`}>
			{tab.icon?.position !== "right" && icon}
			{tab.label}
			{tab.icon?.position === "right" && icon}
			{tab.badge !== undefined && (
				<Badge
					size="counter"
					variant="secondary"
					className="ml-1 bg-muted-foreground/15"
					data-testid={`tab-badge-${tab.label}`}
				>
					{tab.badge}
				</Badge>
			)}
			{errorCount > 0 && (
				<Badge
					variant="destructive"
					size="counter"
					className="ml-1"
					data-testid={`tab-error-badge-${tab.label}`}
				>
					{errorCount}
				</Badge>
			)}
		</TabsTrigger>
	);
}

/** Field names declared under each tab's body, recomputed only when the tab set changes. */
function useTabFieldNames(tabs: TabsOptions["tabs"]): string[][] {
	const [names, setNames] = useState(() => tabs.map((tab) => collectFieldNames(tab.body)));
	const tabsRef = useRef(tabs);
	if (tabsRef.current !== tabs) {
		tabsRef.current = tabs;
		const next = tabs.map((tab) => collectFieldNames(tab.body));
		setNames(next);
		return next;
	}
	return names;
}

interface TabErrorAutoSwitchInput {
	tabFieldNames: string[][];
	activeIndex: number;
	setActiveIndex: (index: number) => void;
}

/**
 * Per-tab error counts (for badges) plus auto-switching to the first tab
 * with an error whenever a submit attempt applies new field errors and the
 * currently active tab is clean — otherwise a validation failure in a
 * hidden tab is invisible behind a generic "fix the highlighted fields"
 * toast. Outside a form (or a form with no fieldErrors/errorScrollTick,
 * e.g. a plain display-tabs layout) this is a no-op: useNearestFormHandle
 * returns null and every count is 0.
 */
function useTabErrorAutoSwitch({
	tabFieldNames,
	activeIndex,
	setActiveIndex,
}: TabErrorAutoSwitchInput): number[] {
	const ctrl = useNearestFormHandle();
	// A stable empty-object fallback: `ctrl?.fieldErrors ?? {}` would mint a
	// fresh {} every render whenever ctrl is null, making the effect below
	// see a "changed" dependency on every render instead of only on a real
	// fieldErrors update.
	const fieldErrors = ctrl?.fieldErrors ?? EMPTY_FIELD_ERRORS;
	const errorScrollTick = ctrl?.errorScrollTick ?? 0;
	const prevTickRef = useRef(0);
	const counts = tabFieldNames.map((names) => countTabErrors(names, fieldErrors));

	useEffect(() => {
		if (errorScrollTick === 0 || errorScrollTick === prevTickRef.current) {
			return;
		}
		prevTickRef.current = errorScrollTick;
		const activeHasError = countTabErrors(tabFieldNames[activeIndex] ?? [], fieldErrors) > 0;
		if (activeHasError) {
			return;
		}
		const firstErrored = firstTabIndexWithError(tabFieldNames, fieldErrors);
		if (firstErrored !== null) {
			setActiveIndex(firstErrored);
		}
		// fieldErrors changes on every keystroke (revalidateField), but the
		// errorScrollTick guard above makes every one of those extra runs a
		// no-op — only a genuinely new tick (once per submit attempt) reaches
		// past it and can switch tabs.
	}, [errorScrollTick, activeIndex, tabFieldNames, fieldErrors, setActiveIndex]);

	return counts;
}

export function WidgetBlock({ options }: RenderProps<WidgetOptions>) {
	const Component = options.component;
	return <Component {...(options.props ?? {})} />;
}
