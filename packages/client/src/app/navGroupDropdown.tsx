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
 * until opened.
 */
export function NavGroupDropdown({ group, currentUrl, rail = false }: NavGroupDropdownProps) {
	const active = group.items.some((item) => containsActive(item, currentUrl));
	return (
		<DropdownMenu>
			<GroupTrigger group={group} active={active} rail={rail} />
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
	active,
	rail,
}: {
	group: NavGroup;
	active: boolean;
	rail: boolean;
}) {
	if (rail) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger
						data-testid={`nav-group-trigger-${group.key}`}
						aria-label={group.group}
						className={cn(
							"flex size-9 items-center justify-center rounded-md hover:bg-accent",
							active && "bg-accent",
						)}
					>
						<NodeIcon icon={group.icon} className="size-4 shrink-0" />
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="right">{group.group}</TooltipContent>
			</Tooltip>
		);
	}
	return (
		<DropdownMenuTrigger
			data-testid={`nav-group-trigger-${group.key}`}
			className={cn(
				"flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm tracking-wide hover:bg-accent",
				active && "bg-accent font-medium",
			)}
		>
			<NodeIcon icon={group.icon} className="size-4 shrink-0" />
			<span>{group.group}</span>
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
