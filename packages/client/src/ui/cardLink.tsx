import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
import { isExternalUrl } from "../lib/externalUrl";

/**
 * Wraps a whole card (a stat, a linked section) in one link. A grid box, so the
 * card keeps its block layout and still stretches to its grid row's height.
 * Same-origin → Inertia visit; off-origin, mailto: or newTab → a native <a>.
 */
export function CardLink({
	url,
	newTab,
	testId,
	children,
}: {
	url: string;
	newTab: boolean;
	testId: string;
	children: ReactNode;
}) {
	const className = "grid rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring";
	if (newTab || isExternalUrl(url)) {
		return (
			<a
				href={url}
				className={className}
				data-testid={testId}
				{...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			>
				{children}
			</a>
		);
	}
	return (
		<Link href={url} className={className} data-testid={testId}>
			{children}
		</Link>
	);
}
