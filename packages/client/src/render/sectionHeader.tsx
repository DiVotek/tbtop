import { Link } from "@inertiajs/react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { isExternalUrl } from "../lib/externalUrl";
import { type IconDef, NodeIcon } from "../ui/node-icon";

interface SectionHeaderAction {
	label: string;
	url: string;
}

interface SectionHeaderProps {
	title?: string;
	description?: string;
	icon?: IconDef;
	/** @deprecated Legacy hand-built payloads only; rendered before `actions`. Removed in 1.0. */
	action?: SectionHeaderAction;
	/** Already-rendered header-row actions (options.actions). */
	actions?: ReactNode;
	collapsible?: boolean;
	open: boolean;
	onToggle: () => void;
	variant?: "card" | "plain";
}

const VARIANT_HEADING_CLASS = {
	card: "text-sm font-semibold",
	plain: "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
} as const;

/** Section title/description/icon row, optionally a chevron-toggle button and right-aligned actions. */
export function SectionHeader({
	title,
	description,
	icon,
	action,
	actions,
	collapsible,
	open,
	onToggle,
	variant,
}: SectionHeaderProps) {
	if (!title && !description && !icon && !action && actions === undefined) {
		return null;
	}
	const Heading = variant === undefined ? "h2" : "h3";
	const headingClass =
		variant === undefined ? "text-lg font-semibold" : VARIANT_HEADING_CLASS[variant];
	const heading = (
		<div className="flex items-center gap-2">
			{icon?.position !== "right" && <NodeIcon icon={icon} />}
			{title && <Heading className={headingClass}>{title}</Heading>}
			{icon?.position === "right" && <NodeIcon icon={icon} />}
		</div>
	);
	const titleRow = collapsible ? (
		<button
			type="button"
			className="flex items-center justify-between gap-2 text-left"
			onClick={onToggle}
			aria-expanded={open}
			data-testid="section-toggle"
		>
			{heading}
			{open ? (
				<ChevronDownIcon className="size-4 shrink-0" />
			) : (
				<ChevronRightIcon className="size-4 shrink-0" />
			)}
		</button>
	) : (
		heading
	);
	return (
		<div className="flex flex-col gap-1">
			{action || actions !== undefined ? (
				<div className="flex items-center justify-between gap-2">
					{titleRow}
					<div className="flex shrink-0 items-center gap-2" data-testid="section-actions">
						{action && <SectionActionLink action={action} />}
						{actions}
					</div>
				</div>
			) : (
				titleRow
			)}
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
		</div>
	);
}

const ACTION_CLASS = "shrink-0 text-sm text-muted-foreground hover:text-foreground";

// Inertia's <Link> only handles same-origin routes; anything else is a normal browser navigation.
function SectionActionLink({ action }: { action: SectionHeaderAction }) {
	if (isExternalUrl(action.url)) {
		return (
			<a href={action.url} className={ACTION_CLASS} data-testid="section-action">
				{action.label}
			</a>
		);
	}
	return (
		<Link href={action.url} className={ACTION_CLASS} data-testid="section-action">
			{action.label}
		</Link>
	);
}
