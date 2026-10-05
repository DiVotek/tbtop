import { type ReactNode, useState } from "react";
import { cn } from "../lib/cn";
import { type ColumnsSpec, resolveColumnsClass } from "../structure/columnsSpec";
import type { StructureNode } from "../structure/structure";
import { CardLink } from "../ui/cardLink";
import type { IconDef } from "../ui/node-icon";
import type { RenderProps } from "./blockRegistry";
import { mapChildren } from "./mapChildren";
import { SectionHeader } from "./sectionHeader";
import { CardSection, PlainSection } from "./sectionVariants";

interface SectionOptions {
	title?: string;
	description?: string;
	icon?: IconDef;
	aside?: StructureNode;
	/** @deprecated Legacy hand-built payloads only; PHP emits `actions`. Removed in 1.0. */
	action?: { label: string; url: string };
	actions?: StructureNode[];
	url?: string;
	newTab?: boolean;
	collapsible?: boolean;
	collapsed?: boolean;
	columns?: ColumnsSpec;
	variant?: "card" | "plain";
	class?: string;
}

// A table draws its own border/rows; a card section's body padding would
// double the frame. Detected from direct children only — a table nested
// inside a further layout wrapper (stack/grid) still gets the card padding,
// matching how the frameless carve-out reads today (see sectionVariants.tsx).
function hasTableChild(children: StructureNode[] | undefined): boolean {
	return (children ?? []).some((child) => child.kind === "table");
}

export function SectionBlock(props: RenderProps<SectionOptions>) {
	const { url, newTab } = props.options;
	const section = <SectionChrome {...props} />;
	if (url === undefined) {
		return section;
	}
	return (
		<CardLink url={url} newTab={newTab === true} testId="section-link">
			{section}
		</CardLink>
	);
}

function SectionChrome({ options, children, renderChild }: RenderProps<SectionOptions>) {
	const [open, setOpen] = useState(!options.collapsed);
	const expanded = options.collapsible ? open : true;
	const content = sectionContent(options, expanded ? children : null, renderChild);
	const actions = renderActions(options.actions, renderChild);
	const hasHeader =
		options.title !== undefined ||
		options.description !== undefined ||
		options.icon !== undefined ||
		options.action !== undefined ||
		actions !== undefined;
	const header = hasHeader ? (
		<SectionHeader
			title={options.title}
			description={options.description}
			icon={options.icon}
			action={options.action}
			actions={actions}
			collapsible={options.collapsible}
			open={open}
			onToggle={() => setOpen((prev) => !prev)}
			variant={options.variant}
		/>
	) : undefined;
	if (options.variant === "card") {
		return (
			<CardSection header={header} frameless={hasTableChild(children)} class={options.class}>
				{content}
			</CardSection>
		);
	}
	if (options.variant === "plain") {
		return (
			<PlainSection header={header} class={options.class}>
				{content}
			</PlainSection>
		);
	}
	return (
		<section className={cn("flex flex-col gap-3", options.class)} data-testid="section-block">
			{header}
			{/* aside is a persistent context slot (actions/status) — it stays visible
			   even when collapsible hides the body; see docs/ai/authoring-pages.md */}
			{content}
		</section>
	);
}

/**
 * The body plus the aside column. `children` is null while collapsed: the body
 * is hidden, the aside stays visible.
 */
function sectionContent(
	options: SectionOptions,
	children: StructureNode[] | undefined | null,
	renderChild: (node: StructureNode) => ReactNode,
): ReactNode {
	const bodyClass =
		options.columns != null
			? `grid gap-4 ${resolveColumnsClass(options.columns)}`
			: "flex flex-col gap-3";
	const body =
		children === null ? null : (
			<div className={bodyClass}>{mapChildren(children, renderChild)}</div>
		);
	if (!options.aside) {
		return body;
	}
	return (
		<div className="flex flex-col gap-4 md:flex-row">
			<div className="min-w-0 flex-1">{body}</div>
			<div className="w-full shrink-0 md:w-64" data-testid="section-aside">
				{renderChild(options.aside)}
			</div>
		</div>
	);
}

/** Header-row actions; undefined when there are none, so they do not force a header. */
function renderActions(
	actions: StructureNode[] | undefined,
	renderChild: (node: StructureNode) => ReactNode,
): ReactNode | undefined {
	if (actions === undefined || actions.length === 0) {
		return undefined;
	}
	return mapChildren(actions, renderChild);
}
