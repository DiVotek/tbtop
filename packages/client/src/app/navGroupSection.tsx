import { Link } from "@inertiajs/react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn";
import { isExternalUrl } from "../structure/actionBlock";
import { resolveColorClasses } from "../structure/table/colorRegistry";
import { Badge } from "../ui/badge";
import { NodeIcon } from "../ui/node-icon";
import type { ChromeData, NavGroup, NavItem } from "./chromeContext";

interface NavGroupSectionProps {
	group: NavGroup;
	currentUrl: ChromeData["currentUrl"];
}

/**
 * A sidebar group: a label header — optionally with an icon and, when
 * collapsible, a chevron toggle — above its item links. Items carry their
 * own icon and badge.
 */
export function NavGroupSection({ group, currentUrl }: NavGroupSectionProps) {
	const [open, setOpen] = useState(!group.collapsed);
	const expanded = group.collapsible ? open : true;

	return (
		<div className="flex flex-col gap-1">
			{group.collapsible ? (
				<button
					type="button"
					onClick={() => setOpen((value) => !value)}
					aria-expanded={expanded}
					data-testid={`nav-group-toggle-${group.group}`}
					className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium uppercase text-muted-foreground hover:text-foreground"
				>
					<GroupHeading group={group} />
					{expanded ? (
						<ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
					) : (
						<ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
					)}
				</button>
			) : (
				<div className="flex items-center gap-1.5 px-2 text-xs font-medium uppercase text-muted-foreground">
					<GroupHeading group={group} />
				</div>
			)}
			{expanded && (
				<div className="flex flex-col gap-1">
					{group.items.map((item) => (
						<NavItemNode key={item.href} item={item} currentUrl={currentUrl} />
					))}
				</div>
			)}
		</div>
	);
}

function GroupHeading({ group }: { group: NavGroup }) {
	return (
		<>
			<NodeIcon icon={group.icon} className="size-3.5 shrink-0" />
			<span className="flex-1 text-left">{group.group}</span>
		</>
	);
}

interface NavItemLinkProps {
	item: NavItem;
	currentUrl: string;
}

export function NavItemLink({ item, currentUrl }: NavItemLinkProps) {
	const active = currentUrl.startsWith(item.href);
	const icon = item.icon ? <NodeIcon icon={item.icon} className="size-4 shrink-0" /> : null;
	const className = cn(
		"flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
		active && "bg-accent font-medium",
	);
	const content = (
		<>
			{item.icon?.position !== "right" && icon}
			<span className="flex-1 truncate">{item.label}</span>
			{item.icon?.position === "right" && icon}
			{item.badge !== undefined && <NavBadge badge={item.badge} color={item.badgeColor} />}
		</>
	);

	if (item.newTab || isExternalUrl(item.href)) {
		return (
			<a
				href={item.href}
				className={className}
				target={item.newTab ? "_blank" : undefined}
				rel={item.newTab ? "noopener noreferrer" : undefined}
			>
				{content}
			</a>
		);
	}
	return (
		<Link href={item.href} className={className}>
			{content}
		</Link>
	);
}

/** True when the item or any nested descendant matches the current URL. */
export function containsActive(item: NavItem, currentUrl: string): boolean {
	if (currentUrl.startsWith(item.href)) {
		return true;
	}
	return (item.children ?? []).some((child) => containsActive(child, currentUrl));
}

interface NavItemNodeProps {
	item: NavItem;
	currentUrl: string;
}

/**
 * A leaf item renders as a link. A parent (has children) renders its own
 * link plus a chevron toggle — the same collapse affordance as a nav group
 * header — expanding to its indented children.
 */
export function NavItemNode({ item, currentUrl }: NavItemNodeProps) {
	const children = item.children ?? [];
	const [open, setOpen] = useState(() => containsActive(item, currentUrl));

	if (children.length === 0) {
		return <NavItemLink item={item} currentUrl={currentUrl} />;
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-1">
				<div className="min-w-0 flex-1">
					<NavItemLink item={item} currentUrl={currentUrl} />
				</div>
				<button
					type="button"
					onClick={() => setOpen((value) => !value)}
					aria-expanded={open}
					data-testid={`nav-item-toggle-${item.href}`}
					className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
				>
					{open ? (
						<ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
					) : (
						<ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
					)}
				</button>
			</div>
			{open && (
				<div className="ml-3 flex flex-col gap-1 border-l pl-3">
					{children.map((child) => (
						<NavItemNode key={child.href} item={child} currentUrl={currentUrl} />
					))}
				</div>
			)}
		</div>
	);
}

function NavBadge({ badge, color }: { badge: string; color?: string }) {
	const classes = resolveColorClasses(color ?? "primary");
	return (
		<Badge
			className={cn(
				"h-5 min-w-5 border-transparent px-1.5 text-[10px]",
				classes.bg,
				classes.text,
			)}
			data-testid="nav-badge"
		>
			{badge}
		</Badge>
	);
}
