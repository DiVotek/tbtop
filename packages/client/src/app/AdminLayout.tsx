import { usePage } from "@inertiajs/react";
import { type ReactNode, useMemo } from "react";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import type { StructureNode } from "../structure/types";
import { LogoBlock, NavMenuBlock, UserMenuBlock } from "./chromeBlocks";
import {
	type ChromeData,
	ChromeDataContext,
	type ChromeUser,
	type NavGroup,
} from "./chromeContext";
import { type ShellFrameProps, SidebarFrame, TopbarFrame } from "./shellFrames";

/** Server-authored chrome trees from the `tbtop.chrome` shared prop. */
export interface ChromeTrees {
	header?: StructureNode | null;
	sidebar?: StructureNode | null;
	footer?: StructureNode | null;
}

/** Shell navigation layout, mirrors PanelConfig::navigation() on the server. */
export type NavigationLayout = "sidebar" | "topbar";

interface SharedProps {
	tbtop?: {
		nav?: NavGroup[];
		chrome?: ChromeTrees;
		brand?: string | null;
		navigation?: NavigationLayout;
		notifications?: { pollInterval?: number | null };
	};
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
}

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
}: AdminLayoutShellProps) {
	const topbar = navigation === "topbar";
	const slotProps: AdminLayoutSlotProps = { nav, user };
	const chromeData: ChromeData = {
		nav,
		user,
		currentUrl,
		brand: brand ?? null,
		orientation: "vertical",
		logoSlot: slots?.logo?.(slotProps),
		notificationsPollInterval,
	};

	const sidebar = slots?.sidebar
		? slots.sidebar(slotProps)
		: renderArea(chrome?.sidebar, <DefaultSidebar />);
	const header = slots?.header
		? slots.header(slotProps)
		: renderArea(chrome?.header, <DefaultHeader />);
	const footer = slots?.footer ? slots.footer(slotProps) : renderArea(chrome?.footer, null);

	const frameProps: ShellFrameProps = { sidebar, header, footer, children };

	return (
		<ChromeDataContext.Provider value={chromeData}>
			{topbar ? <TopbarFrame {...frameProps} /> : <SidebarFrame {...frameProps} />}
		</ChromeDataContext.Provider>
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

	return (
		<AdminLayoutShell
			nav={nav}
			user={user}
			currentUrl={url}
			slots={slots}
			chrome={props.tbtop?.chrome}
			brand={props.tbtop?.brand}
			navigation={props.tbtop?.navigation ?? "sidebar"}
			notificationsPollInterval={props.tbtop?.notifications?.pollInterval}
		>
			{children}
		</AdminLayoutShell>
	);
}

function renderArea(tree: StructureNode | null | undefined, fallback: ReactNode): ReactNode {
	return tree ? <ChromeTree tree={tree} /> : fallback;
}

function ChromeTree({ tree }: { tree: StructureNode }) {
	// Chrome trees are page-independent: server actions are rejected at
	// serialization time, so no page basePath or data bag is needed here.
	const node = useMemo(() => materialize(tree, { basePath: "", data: {} }), [tree]);
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
