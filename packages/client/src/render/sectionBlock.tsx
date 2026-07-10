import { useState } from "react";
import { cn } from "../lib/cn";
import { type ColumnsSpec, resolveColumnsClass } from "../structure/columnsSpec";
import type { StructureNode } from "../structure/structure";
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
	action?: { label: string; url: string };
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

export function SectionBlock({ options, children, renderChild }: RenderProps<SectionOptions>) {
	const [open, setOpen] = useState(!options.collapsed);
	const expanded = options.collapsible ? open : true;
	const bodyClass =
		options.columns != null
			? `grid gap-4 ${resolveColumnsClass(options.columns)}`
			: "flex flex-col gap-3";
	const body = expanded && <div className={bodyClass}>{mapChildren(children, renderChild)}</div>;
	if (options.variant === "card") {
		return (
			<CardSection
				title={options.title}
				action={options.action}
				frameless={hasTableChild(children)}
				class={options.class}
			>
				{body}
			</CardSection>
		);
	}
	if (options.variant === "plain") {
		return (
			<PlainSection title={options.title} class={options.class}>
				{body}
			</PlainSection>
		);
	}
	return (
		<section className={cn("flex flex-col gap-3", options.class)} data-testid="section-block">
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
