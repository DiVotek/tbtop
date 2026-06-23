import { Link } from "@inertiajs/react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn";
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
						<NavItemLink key={item.href} item={item} currentUrl={currentUrl} />
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

function NavItemLink({ item, currentUrl }: NavItemLinkProps) {
	const active = currentUrl.startsWith(item.href);
	const icon = item.icon ? <NodeIcon icon={item.icon} className="size-4 shrink-0" /> : null;
	return (
		<Link
			href={item.href}
			className={cn(
				"flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
				active && "bg-accent font-medium",
			)}
		>
			{item.icon?.position !== "right" && icon}
			<span className="flex-1 truncate">{item.label}</span>
			{item.icon?.position === "right" && icon}
			{item.badge !== undefined && <NavBadge badge={item.badge} color={item.badgeColor} />}
		</Link>
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
