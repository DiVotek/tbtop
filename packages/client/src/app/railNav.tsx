import { Link } from "@inertiajs/react";
import { type Ref, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { NodeIcon } from "../ui/node-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { type NavGroup, useChromeData } from "./chromeContext";
import { RailItemGlyph } from "./navGroupDropdown";
import { NavGroupItems } from "./navGroupSection";
import { railGroups, railTarget } from "./navRail";

const HOME_ICON = { name: "home", position: "left" } as const;

function useGroupLabel(): (group: NavGroup) => string {
	const t = useTranslation();
	return (group) => group.group ?? t("nav.home_entry");
}

function railTestId(prefix: string, group: NavGroup): string {
	return `${prefix}-${group.key === "" ? "home" : group.key}`;
}

function GroupGlyph({ group, label }: { group: NavGroup; label: string }) {
	const icon = group.icon ?? (group.group === null ? HOME_ICON : undefined);
	return icon ? (
		<NodeIcon icon={icon} className="size-4 shrink-0" />
	) : (
		<RailItemGlyph label={label} />
	);
}

/**
 * Desktop rail: one icon-over-label entry per group, each navigating to the
 * group's first page. The label is the entry's accessible name; a tooltip
 * repeats it only when the rail width truncates it.
 */
export function RailStrip() {
	const { nav, activeGroup } = useChromeData();
	const labelOf = useGroupLabel();
	return (
		<nav className="flex w-full flex-col items-center gap-1 px-1" data-testid="admin-rail">
			{railGroups(nav).map((group) => (
				<RailEntry
					key={group.key}
					group={group}
					label={labelOf(group)}
					active={group.key === activeGroup}
				/>
			))}
		</nav>
	);
}

function RailEntry({ group, label, active }: { group: NavGroup; label: string; active: boolean }) {
	const labelRef = useRef<HTMLSpanElement>(null);
	const truncated = useIsTruncated(labelRef, label);
	return (
		<Tooltip open={truncated ? undefined : false}>
			<TooltipTrigger asChild>
				<Link
					href={railTarget(group)?.href ?? ""}
					aria-current={active ? "true" : undefined}
					data-testid={railTestId("nav-rail", group)}
					className={cn(RAIL_ENTRY_CLASS, "w-full", active && "bg-accent")}
				>
					<GroupGlyph group={group} label={label} />
					<RailLabel ref={labelRef} label={label} />
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

const RAIL_ENTRY_CLASS =
	"flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-1.5 hover:bg-accent";

function RailLabel({ label, ref }: { label: string; ref?: Ref<HTMLSpanElement> }) {
	return (
		<span ref={ref} className="w-full truncate text-center text-[11px] leading-tight">
			{label}
		</span>
	);
}

/** Measured once per label: the rail has a fixed width, so it only changes with the text. */
function useIsTruncated(ref: RefObject<HTMLElement | null>, text: string): boolean {
	const [truncated, setTruncated] = useState(false);
	useLayoutEffect(() => {
		const element = ref.current;
		setTruncated(element !== null && text !== "" && element.scrollWidth > element.clientWidth);
	}, [ref, text]);
	return truncated;
}

/** Desktop sidebar column: the active group's title and items. */
export function ActiveGroupPanel() {
	const { nav, activeGroup, currentUrl } = useChromeData();
	const labelOf = useGroupLabel();
	const group = nav.find((candidate) => candidate.key === activeGroup);
	if (!group) {
		return null;
	}
	return <GroupList group={group} title={labelOf(group)} currentUrl={currentUrl} />;
}

/**
 * Mobile drawer: a row of the same icon-over-label entries that swaps the
 * list below without navigating.
 * SidebarDrawer remounts it per opening, so each one starts from the page's group.
 */
export function RailDrawerNav() {
	const { nav, activeGroup, currentUrl } = useChromeData();
	const labelOf = useGroupLabel();
	const groups = railGroups(nav);
	const [selected, setSelected] = useState(activeGroup);
	const group = groups.find((candidate) => candidate.key === selected) ?? groups[0];
	return (
		<nav className="flex flex-col gap-3" data-testid="admin-sidebar">
			<div className="flex gap-1 overflow-x-auto pb-1">
				{groups.map((candidate) => (
					<button
						key={candidate.key}
						type="button"
						aria-pressed={candidate.key === group?.key}
						data-testid={railTestId("nav-drawer-group", candidate)}
						onClick={() => setSelected(candidate.key)}
						className={cn(
							RAIL_ENTRY_CLASS,
							"w-16 shrink-0",
							candidate.key === group?.key && "bg-accent",
						)}
					>
						<GroupGlyph group={candidate} label={labelOf(candidate)} />
						<RailLabel label={labelOf(candidate)} />
					</button>
				))}
			</div>
			{group && <GroupList group={group} title={labelOf(group)} currentUrl={currentUrl} />}
		</nav>
	);
}

function GroupList({
	group,
	title,
	currentUrl,
}: {
	group: NavGroup;
	title: string;
	currentUrl: string;
}) {
	return (
		<div className="flex flex-col gap-1" data-testid="nav-active-group">
			<div className="px-2 pb-1 text-sm font-semibold">{title}</div>
			<NavGroupItems group={group} currentUrl={currentUrl} />
		</div>
	);
}
