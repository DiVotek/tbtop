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
 * until opened. The ungrouped bucket (group: null) has no group trigger:
 * each item renders inline as its own link (icon-only in rail mode) — unless
 * it has children, in which case it gets its own dropdown trigger (same
 * shell as a group's) opening a menu of its children.
 */
export function NavGroupDropdown({ group, currentUrl, rail = false }: NavGroupDropdownProps) {
	const active = group.items.some((item) => containsActive(item, currentUrl));
	if (group.group === null) {
		return (
			<div className={cn("flex gap-1", rail && "flex-col")} data-testid="nav-ungrouped">
				{group.items.map((item) => (
					<UngroupedItem
						key={item.href}
						item={item}
						currentUrl={currentUrl}
						rail={rail}
					/>
				))}
			</div>
		);
	}
	return (
		<DropdownMenu>
			<TriggerButton
				testid={`nav-group-trigger-${group.key}`}
				icon={group.icon}
				label={group.group}
				active={active}
				rail={rail}
			/>
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

/**
 * Ungrouped parent item (has children): same dropdown shell as a declared
 * group (topbar trigger + menu, or rail icon-only trigger), but the trigger
 * carries the item's own icon/label instead of a group's — there is no
 * group heading to show. Children reuse DropdownNavItem, so nested
 * grandchildren still work via its own DropdownMenuSub recursion.
 */
function UngroupedItemDropdown({
	item,
	currentUrl,
	rail,
}: {
	item: NavItem;
	currentUrl: string;
	rail: boolean;
}) {
	const active = containsActive(item, currentUrl);
	return (
		<DropdownMenu>
			<TriggerButton
				testid={`nav-ungrouped-trigger-${item.href}`}
				icon={item.icon}
				label={item.label}
				active={active}
				rail={rail}
			/>
			<DropdownMenuContent
				align="start"
				side={rail ? "right" : "bottom"}
				className="min-w-44"
				data-testid={`nav-ungrouped-menu-${item.href}`}
			>
				{item.children?.map((child) => (
					<DropdownNavItem key={child.href} item={child} currentUrl={currentUrl} />
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * The dropdown trigger shared by a declared group and an ungrouped parent
 * item: icon-only with a tooltip in rail mode, icon + label + chevron
 * otherwise. `testid`/`icon`/`label` let both callers plug in their own
 * (group vs. item) source of truth.
 */
function TriggerButton({
	testid,
	icon,
	label,
	active,
	rail,
}: {
	testid: string;
	icon: NavGroup["icon"];
	label: string;
	active: boolean;
	rail: boolean;
}) {
	if (rail) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger
						data-testid={testid}
						aria-label={label}
						className={cn(
							"flex size-9 items-center justify-center rounded-md hover:bg-accent",
							active && "bg-accent",
						)}
					>
						<NodeIcon icon={icon} className="size-4 shrink-0" />
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="right">{label}</TooltipContent>
			</Tooltip>
		);
	}
	return (
		<DropdownMenuTrigger
			data-testid={testid}
			className={cn(
				"flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm tracking-wider hover:bg-accent",
				active && "bg-accent font-medium",
			)}
		>
			<NodeIcon icon={icon} className="size-4 shrink-0" />
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

/**
 * Rail rendering of an ungrouped item: icon-only link, label in a tooltip.
 * Without an icon there is nothing to show in the size-9 box, so it falls
 * back to the label's first letter — same box size as NodeIcon's icons.
 */
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
					{item.icon ? (
						<NodeIcon icon={item.icon} className="size-4 shrink-0" />
					) : (
						<RailItemGlyph label={item.label} />
					)}
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right">{item.label}</TooltipContent>
		</Tooltip>
	);
}

/** Fallback glyph for a rail item with no icon: its label's first letter. */
function RailItemGlyph({ label }: { label: string }) {
	return (
		<span
			className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-medium uppercase"
			aria-hidden
		>
			{label.charAt(0)}
		</span>
	);
}

function UngroupedItem({
	item,
	currentUrl,
	rail,
}: {
	item: NavItem;
	currentUrl: string;
	rail: boolean;
}) {
	if (item.children && item.children.length > 0) {
		return <UngroupedItemDropdown item={item} currentUrl={currentUrl} rail={rail} />;
	}
	if (rail) {
		return <RailItemLink item={item} currentUrl={currentUrl} />;
	}
	return <NavItemLink item={item} currentUrl={currentUrl} />;
}
