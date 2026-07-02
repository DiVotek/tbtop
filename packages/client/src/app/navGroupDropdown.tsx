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
import type { ChromeData, NavGroup, NavItem } from "./chromeContext";
import { NavItemLink } from "./navGroupSection";

interface NavGroupDropdownProps {
	group: NavGroup;
	currentUrl: ChromeData["currentUrl"];
}

/**
 * Topbar group: a trigger button (group icon + label + chevron) opening a
 * dropdown of the group's item links. Reuses the sidebar item renderer, so
 * item icons and badges carry over unchanged. The trigger highlights when
 * the current page lives inside the group. Being a dropdown, it subsumes
 * the sidebar's collapsible/collapsed behaviour — every group is collapsed
 * until opened.
 */
export function NavGroupDropdown({ group, currentUrl }: NavGroupDropdownProps) {
	const active = group.items.some((item) => currentUrl.startsWith(item.href));
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				data-testid={`nav-group-trigger-${group.group}`}
				className={cn(
					"flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
					active && "bg-accent font-medium",
				)}
			>
				<NodeIcon icon={group.icon} className="size-4 shrink-0" />
				<span>{group.group}</span>
				<ChevronDownIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="min-w-44"
				data-testid={`nav-group-menu-${group.group}`}
			>
				{group.items.map((item) => (
					<DropdownNavItem key={item.href} item={item} currentUrl={currentUrl} />
				))}
			</DropdownMenuContent>
		</DropdownMenu>
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
