import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { type ColumnsSpec, resolveColumnsClass } from "../structure/columnsSpec";
import { collectFieldNames, countTabErrors, firstTabIndexWithError } from "../structure/fieldNames";
import { useNearestFormController } from "../structure/formContext";
import type { StructureNode } from "../structure/structure";
import { TriggerVariantProvider } from "../structure/triggerVariantContext";
import { Badge } from "../ui/badge";
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
	class?: string;
	[key: string]: unknown;
}

interface RowOptions {
	variant?: "grid";
	[key: string]: unknown;
}

interface GridOptions {
	cols?: ColumnsSpec;
	gap?: number;
	class?: string;
}

interface TabsOptions {
	tabs: { label: string; body: StructureNode; icon?: IconDef; badge?: string }[];
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

export function StackBlock({ options, children, renderChild }: RenderProps<StackOptions>) {
	return (
		<div className={cn("flex flex-col gap-4", options.class)}>
			{mapChildren(children, renderChild)}
		</div>
	);
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
						<TriggerVariantProvider value="plain">
							{renderChild(child)}
						</TriggerVariantProvider>
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
	const { tabs } = options;
	const tabFieldNames = useTabFieldNames(tabs);
	const [active, setActive] = useState("0");
	const errorCounts = useTabErrorAutoSwitch({ tabFieldNames, active, setActive });

	if (tabs.length === 0) {
		return null;
	}
	return (
		<Tabs value={active} onValueChange={setActive} data-testid="tabs">
			<TabsList>
				{tabs.map((tab, i) => (
					<TabTrigger key={i} index={i} tab={tab} errorCount={errorCounts[i] ?? 0} />
				))}
			</TabsList>
			{tabs.map((tab, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: tab positions are stable
				<TabsContent key={i} value={String(i)} data-testid={`tab-panel-${tab.label}`}>
					{renderChild(tab.body)}
				</TabsContent>
			))}
		</Tabs>
	);
}

interface TabTriggerProps {
	index: number;
	tab: TabsOptions["tabs"][number];
	errorCount: number;
}

function TabTrigger({ index, tab, errorCount }: TabTriggerProps) {
	const icon = <NodeIcon icon={tab.icon} className="size-4 shrink-0" />;
	return (
		<TabsTrigger value={String(index)} data-testid={`tab-${tab.label}`}>
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
			{errorCount > 0 && (
				<Badge
					variant="destructive"
					className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px]"
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
	active: string;
	setActive: (value: string) => void;
}

/**
 * Per-tab error counts (for badges) plus auto-switching to the first tab
 * with an error whenever a submit attempt applies new field errors and the
 * currently active tab is clean — otherwise a validation failure in a
 * hidden tab is invisible behind a generic "fix the highlighted fields"
 * toast. Outside a form (or a form with no fieldErrors/errorScrollTick,
 * e.g. a plain display-tabs layout) this is a no-op: useNearestFormController
 * returns null and every count is 0.
 */
function useTabErrorAutoSwitch({
	tabFieldNames,
	active,
	setActive,
}: TabErrorAutoSwitchInput): number[] {
	const ctrl = useNearestFormController();
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
		const activeHasError = countTabErrors(tabFieldNames[Number(active)] ?? [], fieldErrors) > 0;
		if (activeHasError) {
			return;
		}
		const firstErrored = firstTabIndexWithError(tabFieldNames, fieldErrors);
		if (firstErrored !== null) {
			setActive(String(firstErrored));
		}
		// fieldErrors changes on every keystroke (revalidateField), but the
		// errorScrollTick guard above makes every one of those extra runs a
		// no-op — only a genuinely new tick (once per submit attempt) reaches
		// past it and can switch tabs.
	}, [errorScrollTick, active, tabFieldNames, fieldErrors, setActive]);

	return counts;
}

export function WidgetBlock({ options }: RenderProps<WidgetOptions>) {
	const Component = options.component;
	return <Component {...(options.props ?? {})} />;
}
