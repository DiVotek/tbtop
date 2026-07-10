import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { SectionFramelessContext } from "./sectionChrome";

interface SectionAction {
	label: string;
	url: string;
}

interface CardSectionProps {
	title?: string;
	action?: SectionAction;
	children: ReactNode;
	/** A direct table child draws its own border/rows — skip body padding so it isn't double-framed. */
	frameless?: boolean;
	class?: string;
}

/**
 * `variant: 'card'` — bordered card with the header row INSIDE the card.
 * The body gets padding so fields don't touch the card's border, matching
 * the header's `px-4 py-3` rhythm (tighter `pt-3` when a header sits above
 * it). A direct table child stays frameless — the table draws its own edges
 * and padding would double the frame.
 */
export function CardSection({
	title,
	action,
	children,
	frameless,
	class: className,
}: CardSectionProps) {
	const hasHeader = title !== undefined || action !== undefined;
	const bodyClass = frameless ? undefined : cn("px-4 pb-4", hasHeader ? "pt-3" : "pt-4");
	return (
		<section className={cn("rounded-lg border bg-card", className)} data-testid="section-card">
			{hasHeader && (
				<div className="flex items-center justify-between border-b px-4 py-3">
					{title !== undefined && <h3 className="text-sm font-semibold">{title}</h3>}
					{action !== undefined && (
						<Link
							href={action.url}
							className="text-sm text-muted-foreground hover:text-foreground"
							data-testid="section-action"
						>
							{action.label}
						</Link>
					)}
				</div>
			)}
			<SectionFramelessContext.Provider value={true}>
				{bodyClass ? <div className={bodyClass}>{children}</div> : children}
			</SectionFramelessContext.Provider>
		</section>
	);
}

interface PlainSectionProps {
	title?: string;
	children: ReactNode;
	class?: string;
}

/** `variant: 'plain'` — uppercase muted label above unwrapped content. */
export function PlainSection({ title, children, class: className }: PlainSectionProps) {
	return (
		<section className={cn(className)} data-testid="section-plain">
			{title !== undefined && (
				<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</h3>
			)}
			{children}
		</section>
	);
}
