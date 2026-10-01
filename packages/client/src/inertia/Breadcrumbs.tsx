import { Link } from "@inertiajs/react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "../i18n/i18n";
import { isExternalUrl } from "../lib/externalUrl";

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
const CRUMB_LINK_CLASS = "hover:text-foreground transition-colors";

export function Breadcrumbs({ items }: BreadcrumbsProps) {
	const t = useTranslation();
	if (items.length <= 1) {
		return null;
	}

	return (
		<nav aria-label={t("nav.breadcrumb")}>
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
								<CrumbLink url={item.url} label={item.label} />
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

// Inertia's <Link> only handles same-origin routes; anything else is a normal browser navigation.
function CrumbLink({ url, label }: { url: string; label: string }) {
	if (isExternalUrl(url)) {
		return (
			<a href={url} className={CRUMB_LINK_CLASS}>
				{label}
			</a>
		);
	}
	return (
		<Link href={url} className={CRUMB_LINK_CLASS}>
			{label}
		</Link>
	);
}
