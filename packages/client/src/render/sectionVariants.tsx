import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { SectionFramelessContext } from "./sectionChrome";

interface CardSectionProps {
	header?: ReactNode;
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
export function CardSection({ header, children, frameless, class: className }: CardSectionProps) {
	const hasHeader = header !== undefined;
	const hasBody = children !== null && children !== undefined && children !== false;
	const bodyClass = frameless ? undefined : cn("px-4 pb-4", hasHeader ? "pt-3" : "pt-4");
	return (
		<section className={cn("rounded-lg border bg-card", className)} data-testid="section-card">
			{hasHeader && <div className="border-b px-4 py-3">{header}</div>}
			<SectionFramelessContext.Provider value={true}>
				{hasBody && (bodyClass ? <div className={bodyClass}>{children}</div> : children)}
			</SectionFramelessContext.Provider>
		</section>
	);
}

interface PlainSectionProps {
	header?: ReactNode;
	children: ReactNode;
	class?: string;
}

/** `variant: 'plain'` — uppercase muted label above unwrapped content. */
export function PlainSection({ header, children, class: className }: PlainSectionProps) {
	return (
		<section className={cn(className)} data-testid="section-plain">
			{header !== undefined && <div className="mb-3">{header}</div>}
			{children}
		</section>
	);
}
