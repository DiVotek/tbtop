import { Link } from "@inertiajs/react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { type ComponentPropsWithoutRef, Fragment, type Ref, useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { isExternalUrl } from "../structure/actionBlock";
import { resolveColorClasses } from "../structure/table/colorRegistry";
import { Badge } from "../ui/badge";
import { NodeIcon } from "../ui/node-icon";
import type { ChromeData, NavGroup, NavItem } from "./chromeContext";
import { useDensity } from "./densityContext";
import { readGroupExpanded, writeGroupExpanded } from "./navGroupStorage";
import { sectionRuns } from "./navSections";

// New-gen shape: the sidebar tree maps onto upstream's shadcn sidebar parts,
// with visuals from the `cn-sidebar-*` rules in `ui/presets/style-preset-*.css`:
// group header → `cn-sidebar-group-label`, items → `cn-sidebar-group-content`
// + `cn-sidebar-menu`, item links → `cn-sidebar-menu-button` (default
// variant; size `default`, or `sm` in compact density), nested children →
// `cn-sidebar-menu-sub` / `cn-sidebar-menu-sub-button`, a parent's chevron →
// `cn-sidebar-menu-action`. Active state is a `data-active` attribute (the
// preset styles `data-active:`), set only when active. Deltas: plain divs, not
// upstream's ul/li; the group-items indent (pl-5) and collapsible headers are
// ours; section-run headings stay plain text (they are not nested menus);
// badges keep our coloured Badge inline — upstream's `cn-sidebar-menu-badge`
// is absolutely positioned off a `peer/menu-button` sibling and would fight
// the per-item badge colour. NavItemLink's default `menu` shape (used by the
// topbar dropdowns) is unchanged.
const MENU_BUTTON_CLASS =
	"cn-sidebar-menu-button cn-sidebar-menu-button-variant-default peer/menu-button flex w-full items-center overflow-hidden outline-hidden";
const MENU_SUB_BUTTON_CLASS =
	"cn-sidebar-menu-sub-button flex min-w-0 -translate-x-px items-center overflow-hidden outline-hidden";
const GROUP_LABEL_CLASS =
	"cn-sidebar-group-label flex shrink-0 items-center gap-1.5 outline-hidden";

interface NavGroupSectionProps {
	group: NavGroup;
	currentUrl: ChromeData["currentUrl"];
}

/**
 * A sidebar group: a label header — optionally with an icon and, when
 * collapsible, a chevron toggle — above its item links. Items carry their
 * own icon and badge. The ungrouped bucket (group: null) has no header and
 * no indent: its items sit at the level of the other groups' headings.
 */
export function NavGroupSection({ group, currentUrl }: NavGroupSectionProps) {
	// Restore the last collapse choice; fall back to the server's default.
	const [open, setOpen] = useState(() => readGroupExpanded(group.key) ?? !group.collapsed);
	const expanded = group.collapsible ? open : true;

	const toggle = () => {
		setOpen((value) => {
			const next = !value;
			writeGroupExpanded(group.key, next);
			return next;
		});
	};

	if (group.group === null) {
		return (
			<div
				className="cn-sidebar-menu flex w-full min-w-0 flex-col"
				data-slot="sidebar-menu"
				data-testid="nav-ungrouped"
			>
				{group.items.map((item) => (
					<NavItemNode key={item.href} item={item} currentUrl={currentUrl} />
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{group.collapsible ? (
				<button
					type="button"
					onClick={toggle}
					aria-expanded={expanded}
					data-testid={`nav-group-toggle-${group.key}`}
					data-sidebar="group-label"
					className={cn(GROUP_LABEL_CLASS, "w-full hover:text-sidebar-foreground")}
				>
					<GroupHeading group={group} />
					{expanded ? (
						<ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
					) : (
						<ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
					)}
				</button>
			) : (
				<div className={GROUP_LABEL_CLASS} data-sidebar="group-label">
					<GroupHeading group={group} />
				</div>
			)}
			{group.description !== undefined && (
				// Aligned with the item text below (pl-5 indent + item px-2).
				<GroupDescription description={group.description} className="pl-7" />
			)}
			{expanded && (
				// Indent items by the group icon + its gap (size-3.5 + gap-1.5 = 20px)
				// so item text lines up under the group label, showing the nesting.
				<div className="cn-sidebar-group-content w-full" data-slot="sidebar-group-content">
					<div
						className="cn-sidebar-menu flex w-full min-w-0 flex-col pl-5"
						data-slot="sidebar-menu"
					>
						<NavGroupItems group={group} currentUrl={currentUrl} />
					</div>
				</div>
			)}
		</div>
	);
}

/** A group's items split into section runs, each under its plain heading. */
export function NavGroupItems({ group, currentUrl }: NavGroupSectionProps) {
	return sectionRuns(group).map((run) => (
		<Fragment key={run.key}>
			{run.heading !== null && (
				<div
					className="px-2 pt-2 text-xs font-medium text-muted-foreground"
					data-testid={`nav-section-${group.key}-${run.key}`}
				>
					{run.heading}
				</div>
			)}
			{run.items.map((item) => (
				<NavItemNode key={item.href} item={item} currentUrl={currentUrl} />
			))}
		</Fragment>
	));
}

/** The group's one-line description: muted, truncated, full text on hover. */
export function GroupDescription({
	description,
	className,
}: {
	description: string;
	className?: string;
}) {
	return (
		<p
			className={cn("truncate px-2 text-xs text-muted-foreground", className)}
			title={description}
			data-testid="nav-group-description"
		>
			{description}
		</p>
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

interface NavItemLinkProps
	extends Omit<
		ComponentPropsWithoutRef<"a">,
		"children" | "href" | "onClick" | "onError" | "onProgress"
	> {
	item: NavItem;
	currentUrl: string;
	onClick?: ComponentPropsWithoutRef<typeof Link>["onClick"];
	ref?: Ref<HTMLAnchorElement>;
	/** `menu` (default): a dropdown row. The sidebar shapes emit `cn-sidebar-*`. */
	shape?: NavItemShape;
}

type NavItemShape = "menu" | "sidebar-button" | "sidebar-sub-button";

/** Shape → classes and data attributes; `data-active` only when active. */
function shapeProps(shape: NavItemShape, active: boolean, compact: boolean) {
	if (shape === "sidebar-button") {
		const size = compact ? "sm" : "default";
		return {
			className: cn(MENU_BUTTON_CLASS, `cn-sidebar-menu-button-size-${size}`),
			"data-slot": "sidebar-menu-button",
			"data-sidebar": "menu-button",
			"data-size": size,
			"data-active": active || undefined,
		};
	}
	if (shape === "sidebar-sub-button") {
		return {
			className: MENU_SUB_BUTTON_CLASS,
			"data-slot": "sidebar-menu-sub-button",
			"data-sidebar": "menu-sub-button",
			"data-size": "md",
			"data-active": active || undefined,
		};
	}
	return {
		className: cn(
			"flex items-center gap-2 rounded-md text-sm hover:bg-accent",
			compact ? "px-3 py-2" : "px-2 py-1.5",
			active && "bg-accent font-medium",
		),
	};
}

export function NavItemLink({
	item,
	currentUrl,
	className: inheritedClassName,
	ref,
	shape = "menu",
	...linkProps
}: NavItemLinkProps) {
	const active = isActiveUrl(item.href, currentUrl);
	const density = useDensity();
	const icon = item.icon ? <NodeIcon icon={item.icon} className="size-4 shrink-0" /> : null;
	const { className: shapeClassName, ...shapeAttrs } = shapeProps(
		shape,
		active,
		density === "compact",
	);
	const className = cn(inheritedClassName, shapeClassName);
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
				{...linkProps}
				{...shapeAttrs}
				ref={ref}
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
		<Link {...linkProps} {...shapeAttrs} ref={ref} href={item.href} className={className}>
			{content}
		</Link>
	);
}

export function isActiveUrl(itemUrl: string, currentUrl: string): boolean {
	const itemPath = itemUrl.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
	const currentPath = currentUrl.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
	return currentPath === itemPath || (itemPath !== "/" && currentPath.startsWith(`${itemPath}/`));
}

/** True when the item or any nested descendant matches the current URL. */
export function containsActive(item: NavItem, currentUrl: string): boolean {
	if (isActiveUrl(item.href, currentUrl)) {
		return true;
	}
	return (item.children ?? []).some((child) => containsActive(child, currentUrl));
}

interface NavItemNodeProps {
	item: NavItem;
	currentUrl: string;
	/** Inside a parent's `cn-sidebar-menu-sub` (renders sub-buttons). */
	sub?: boolean;
}

/**
 * A leaf item renders as a link. A parent (has children) renders its own
 * link plus a chevron toggle — the same collapse affordance as a nav group
 * header — expanding to its indented children.
 */
export function NavItemNode({ item, currentUrl, sub = false }: NavItemNodeProps) {
	const children = item.children ?? [];
	const active = containsActive(item, currentUrl);
	const [open, setOpen] = useState(() => active);

	useEffect(() => {
		if (active) {
			setOpen(true);
		}
	}, [active]);

	const shape = sub ? "sidebar-sub-button" : "sidebar-button";
	if (children.length === 0) {
		return <NavItemLink item={item} currentUrl={currentUrl} shape={shape} />;
	}

	// Upstream SidebarMenuItem: `relative group/menu-item` positions the
	// absolute `cn-sidebar-menu-action` chevron; the menu button's
	// `group-has-data-[sidebar=menu-action]` rule pads it clear (pr-8). The
	// sub-button has no such rule, so it gets `pr-8!` here (important: the
	// preset layer outranks plain utilities and would keep its `px-2`).
	return (
		<div className="group/menu-item relative flex flex-col" data-slot="sidebar-menu-item">
			<NavItemLink
				item={item}
				currentUrl={currentUrl}
				shape={shape}
				className={sub ? "pr-8!" : undefined}
			/>
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				data-testid={`nav-item-toggle-${item.href}`}
				data-slot="sidebar-menu-action"
				data-sidebar="menu-action"
				className="cn-sidebar-menu-action flex items-center justify-center outline-hidden"
			>
				{open ? (
					<ChevronDownIcon className="size-3.5 shrink-0" aria-hidden />
				) : (
					<ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
				)}
			</button>
			{open && (
				<div
					className="cn-sidebar-menu-sub flex min-w-0 flex-col"
					data-slot="sidebar-menu-sub"
				>
					{children.map((child) => (
						<NavItemNode key={child.href} item={child} currentUrl={currentUrl} sub />
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
