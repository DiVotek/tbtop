import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
import { SectionFramelessContext } from "./sectionChrome";

interface SectionAction {
	label: string;
	url: string;
}

interface CardSectionProps {
	title?: string;
	action?: SectionAction;
	children: ReactNode;
}

/**
 * `variant: 'card'` — bordered card with the header row INSIDE the card.
 * Children render frameless (embedded tables drop their own border).
 */
export function CardSection({ title, action, children }: CardSectionProps) {
	return (
		<section className="rounded-lg border bg-card" data-testid="section-card">
			{(title !== undefined || action !== undefined) && (
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
				{children}
			</SectionFramelessContext.Provider>
		</section>
	);
}

interface PlainSectionProps {
	title?: string;
	children: ReactNode;
}

/** `variant: 'plain'` — uppercase muted label above unwrapped content. */
export function PlainSection({ title, children }: PlainSectionProps) {
	return (
		<section data-testid="section-plain">
			{title !== undefined && (
				<h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</h3>
			)}
			{children}
		</section>
	);
}
