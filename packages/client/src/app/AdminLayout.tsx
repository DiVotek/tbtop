import { usePage } from "@inertiajs/react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "../i18n/i18n";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import type { StructureNode } from "../structure/types";
import { type Appearance, MAX_WIDTH_CLASS } from "./appearance";
import { LogoBlock, NavMenuBlock, UserMenuBlock } from "./chromeBlocks";
import {
	type ChromeData,
	ChromeDataContext,
	type ChromeUser,
	type NavGroup,
	type NavItem,
} from "./chromeContext";
import { CommandPalette } from "./commandPalette/CommandPalette";
import type { CommandPaletteData } from "./commandPalette/types";
import { DensityContext } from "./densityContext";
import { useRailActiveGroup } from "./navRail";
import { RailSidebarFrame } from "./RailSidebarFrame";
import { type ShellFrameProps, SidebarFrame, TopbarFrame } from "./shellFrames";
import { ThemeSync } from "./ThemeSync";
import { TopbarSidebarFrame } from "./TopbarSidebarFrame";

/** Server-authored chrome trees from the `tbtop.chrome` shared prop. */
export interface ChromeTrees {
	header?: StructureNode | null;
	sidebar?: StructureNode | null;
	footer?: StructureNode | null;
}

/** Shell navigation layout, mirrors PanelConfig::navigation() on the server. */
export type NavigationLayout = "sidebar" | "topbar" | "topbar-sidebar" | "rail-sidebar";

interface SharedProps {
	tbtop?: {
		nav?: NavGroup[];
		userMenuItems?: NavItem[];
		chrome?: ChromeTrees;
		brand?: string | null;
		navigation?: NavigationLayout;
		notifications?: { pollInterval?: number | null };
		appearance?: Appearance | null;
		palette?: CommandPaletteData | null;
		prefix?: string;
		panel?: string;
	};
	/** Page prop: the current page's nav() group key, when it declares one. */
	navGroup?: unknown;
	auth?: { user?: ChromeUser | null };
	[key: string]: unknown;
}

export interface AdminLayoutSlotProps {
	nav: NavGroup[];
	user: ChromeUser | null;
}

interface AdminLayoutSlots {
	header?: (props: AdminLayoutSlotProps) => ReactNode;
	sidebar?: (props: AdminLayoutSlotProps) => ReactNode;
	footer?: (props: AdminLayoutSlotProps) => ReactNode;
	logo?: (props: AdminLayoutSlotProps) => ReactNode;
}

interface AdminLayoutProps {
	children: ReactNode;
	slots?: AdminLayoutSlots;
}

interface AdminLayoutShellProps {
	nav: NavGroup[];
	user: ChromeUser | null;
	currentUrl: string;
	children: ReactNode;
	slots?: AdminLayoutSlots;
	chrome?: ChromeTrees | null;
	brand?: string | null;
	navigation?: NavigationLayout;
	notificationsPollInterval?: number | null;
	appearance?: Appearance | null;
	userMenuItems?: NavItem[];
	homeUrl?: string | null;
	/** rail-sidebar: the page's nav() group, a fallback when no nav item matches the URL. */
	pageNavGroup?: string;
	/** Scopes per-panel client state (the remembered rail group). */
	panelId?: string;
}

const FRAMES: Record<NavigationLayout, (props: ShellFrameProps) => ReactNode> = {
	sidebar: SidebarFrame,
	topbar: TopbarFrame,
	"topbar-sidebar": TopbarSidebarFrame,
	"rail-sidebar": RailSidebarFrame,
};

/**
 * Pure shell — testable without Inertia context. Receives nav/user/url
 * as props. Each area resolves React `slots` first (escape hatch), then
 * the server-authored chrome tree, then the built-in default. The
 * `navigation` layout only changes how those areas are arranged.
 */
export function AdminLayoutShell({
	nav,
	user,
	currentUrl,
	children,
	slots,
	chrome,
	brand,
	navigation = "sidebar",
	notificationsPollInterval,
	appearance,
	userMenuItems,
	homeUrl,
	pageNavGroup,
	panelId,
}: AdminLayoutShellProps) {
	const Frame = FRAMES[navigation] ?? SidebarFrame;
	const maxWidth = appearance?.maxWidth ? MAX_WIDTH_CLASS[appearance.maxWidth] : undefined;
	const density = appearance?.density ?? "default";
	const slotProps: AdminLayoutSlotProps = { nav, user };
	const activeGroup = useRailActiveGroup(navigation === "rail-sidebar", {
		nav,
		currentUrl,
		pageGroup: pageNavGroup,
		panelId,
	});
	const chromeData: ChromeData = {
		nav,
		user,
		currentUrl,
		brand: brand ?? null,
		orientation: "vertical",
		logoSlot: slots?.logo?.(slotProps),
		homeUrl,
		notificationsPollInterval,
		darkMode: appearance?.darkMode,
		defaultTheme: appearance?.defaultTheme,
		userMenuItems,
		activeGroup,
	};

	const sidebar = slots?.sidebar
		? slots.sidebar(slotProps)
		: renderArea(chrome?.sidebar, <DefaultSidebar />);
	const header = slots?.header
		? slots.header(slotProps)
		: renderArea(chrome?.header, <DefaultHeader />);
	const footer = slots?.footer ? slots.footer(slotProps) : renderArea(chrome?.footer, null);

	const frameProps: ShellFrameProps = { sidebar, header, footer, children, maxWidth };

	return (
		<DensityContext.Provider value={density}>
			<ChromeDataContext.Provider value={chromeData}>
				<ThemeSync />
				<Frame {...frameProps} />
			</ChromeDataContext.Provider>
		</DensityContext.Provider>
	);
}

/**
 * Persistent admin shell: sidebar/header/footer come from the
 * server-authored `tbtop.chrome` trees (default Chrome reproduces the
 * stock shell). React `slots` remain the last-resort override.
 */
export function AdminLayout({ children, slots }: AdminLayoutProps) {
	const { props, url } = usePage<SharedProps>();
	const nav = props.tbtop?.nav ?? [];
	const user = props.auth?.user ?? null;
	const palette = props.tbtop?.palette;

	return (
		<>
			<AdminLayoutShell
				nav={nav}
				user={user}
				currentUrl={url}
				slots={slots}
				chrome={props.tbtop?.chrome}
				brand={props.tbtop?.brand}
				navigation={props.tbtop?.navigation ?? "sidebar"}
				notificationsPollInterval={props.tbtop?.notifications?.pollInterval}
				appearance={props.tbtop?.appearance}
				userMenuItems={props.tbtop?.userMenuItems}
				homeUrl={props.tbtop?.prefix}
				pageNavGroup={typeof props.navGroup === "string" ? props.navGroup : undefined}
				panelId={props.tbtop?.panel}
			>
				{children}
			</AdminLayoutShell>
			{palette != null ? <CommandPalette nav={nav} data={palette} /> : null}
		</>
	);
}

function renderArea(tree: StructureNode | null | undefined, fallback: ReactNode): ReactNode {
	return tree ? <ChromeTree tree={tree} /> : fallback;
}

function ChromeTree({ tree }: { tree: StructureNode }) {
	const t = useTranslation();
	// Chrome trees are page-independent: server actions are rejected at
	// serialization time, so no page basePath or data bag is needed here.
	const node = useMemo(() => materialize(tree, { basePath: "", data: {}, t }), [tree, t]);
	return <>{renderNode(node)}</>;
}

// Legacy in-React defaults, used only when neither a slot nor a chrome
// tree is supplied (e.g. shell rendered outside an Inertia page). Same
// components the chrome kinds resolve to — parity by construction.
function DefaultSidebar() {
	return (
		<>
			<LogoBlock />
			<NavMenuBlock />
		</>
	);
}

function DefaultHeader() {
	return <UserMenuBlock />;
}
