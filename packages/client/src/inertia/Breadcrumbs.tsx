import { Link } from "@inertiajs/react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
	label: string;
	url?: string;
}

interface BreadcrumbsProps {
	items: BreadcrumbItem[];
}

/**
 * Page chrome breadcrumbs. Renders nothing when there is only one item
 * (current page title alone adds no navigational value).
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
	if (items.length <= 1) {
		return null;
	}

	return (
		<nav aria-label="Breadcrumb">
			<ol className="flex items-center gap-1 text-sm text-muted-foreground">
				{items.map((item, index) => {
					const isLast = index === items.length - 1;
					return (
						<li key={index} className="flex items-center gap-1">
							{index > 0 && (
								<ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
							)}
							{isLast || !item.url ? (
								<span
									{...(isLast ? { "aria-current": "page" as const } : {})}
									className={isLast ? "font-medium text-foreground" : undefined}
								>
									{item.label}
								</span>
							) : (
								<Link
									href={item.url}
									className="hover:text-foreground transition-colors"
								>
									{item.label}
								</Link>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
