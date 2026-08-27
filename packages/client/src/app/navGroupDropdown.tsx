import { Link } from "@inertiajs/react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "../lib/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { NodeIcon } from "../ui/node-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import type { ChromeData, NavGroup, NavItem } from "./chromeContext";
import { containsActive, NavItemLink } from "./navGroupSection";

interface NavGroupDropdownProps {
	group: NavGroup;
	currentUrl: ChromeData["currentUrl"];
	/**
	 * Rail mode: an icon-only trigger with the group name in a tooltip, and
	 * the item menu opening to the right (the collapsed-sidebar strip).
	 */
	rail?: boolean;
}

/**
 * Topbar group: a trigger button (group icon + label + chevron) opening a
 * dropdown of the group's item links. Reuses the sidebar item renderer, so
 * item icons and badges carry over unchanged. The trigger highlights when
 * the current page lives inside the group. Being a dropdown, it subsumes
 * the sidebar's collapsible/collapsed behaviour — every group is collapsed
 * until opened. The ungrouped bucket (group: null) has no trigger to open:
 * its items render inline, each as its own link (icon-only in rail mode).
 */
export function NavGroupDropdown({ group, currentUrl, rail = false }: NavGroupDropdownProps) {
	const active = group.items.some((item) => containsActive(item, currentUrl));
	if (group.group === null) {
		return (
			<div className={cn("flex gap-1", rail && "flex-col")} data-testid="nav-ungrouped">
				{group.items.map((item) =>
					rail ? (
						<RailItemLink key={item.href} item={item} currentUrl={currentUrl} />
					) : (
						<NavItemLink key={item.href} item={item} currentUrl={currentUrl} />
					),
				)}
			</div>
		);
	}
	return (
		<DropdownMenu>
			<GroupTrigger group={group} label={group.group} active={active} rail={rail} />
			<DropdownMenuContent
				align="start"
				side={rail ? "right" : "bottom"}
				className="min-w-44"
				data-testid={`nav-group-menu-${group.key}`}
			>
				{group.items.map((item) => (
					<DropdownNavItem key={item.href} item={item} currentUrl={currentUrl} />
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function GroupTrigger({
	group,
	label,
	active,
	rail,
}: {
	group: NavGroup;
	label: string;
	active: boolean;
	rail: boolean;
}) {
	if (rail) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger
						data-testid={`nav-group-trigger-${group.key}`}
						aria-label={label}
						className={cn(
							"flex size-9 items-center justify-center rounded-md hover:bg-accent",
							active && "bg-accent",
						)}
					>
						<NodeIcon icon={group.icon} className="size-4 shrink-0" />
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="right">{label}</TooltipContent>
			</Tooltip>
		);
	}
	return (
		<DropdownMenuTrigger
			data-testid={`nav-group-trigger-${group.key}`}
			className={cn(
				"flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm tracking-wider hover:bg-accent",
				active && "bg-accent font-medium",
			)}
		>
			<NodeIcon icon={group.icon} className="size-4 shrink-0" />
			<span>{label}</span>
			<ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
		</DropdownMenuTrigger>
	);
}

function DropdownNavItem({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
	if (!item.children || item.children.length === 0) {
		return (
			<DropdownMenuItem asChild>
				<NavItemLink item={item} currentUrl={currentUrl} />
			</DropdownMenuItem>
		);
	}
	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger data-testid={`nav-group-subtrigger-${item.href}`}>
				<NodeIcon icon={item.icon} className="size-4 shrink-0" />
				<span>{item.label}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent data-testid={`nav-group-submenu-${item.href}`}>
				{item.children.map((child) => (
					<DropdownNavItem key={child.href} item={child} currentUrl={currentUrl} />
				))}
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	);
}

/** Rail rendering of an ungrouped item: icon-only link, label in a tooltip. */
function RailItemLink({ item, currentUrl }: { item: NavItem; currentUrl: string }) {
	const active = containsActive(item, currentUrl);
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					href={item.href}
					aria-label={item.label}
					className={cn(
						"flex size-9 items-center justify-center rounded-md hover:bg-accent",
						active && "bg-accent",
					)}
				>
					<NodeIcon icon={item.icon} className="size-4 shrink-0" />
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right">{item.label}</TooltipContent>
		</Tooltip>
	);
}
