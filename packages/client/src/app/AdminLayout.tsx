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
import { SidebarDrawer } from "./SidebarDrawer";

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
}

interface ShellFrameProps {
	sidebar: ReactNode;
	header: ReactNode;
	footer: ReactNode;
	children: ReactNode;
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
}: AdminLayoutShellProps) {
	const topbar = navigation === "topbar";
	const slotProps: AdminLayoutSlotProps = { nav, user };
	const chromeData: ChromeData = {
		nav,
		user,
		currentUrl,
		brand: brand ?? null,
		orientation: topbar ? "horizontal" : "vertical",
		logoSlot: slots?.logo?.(slotProps),
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

/** Default layout: persistent left sidebar, header strip, mobile drawer. */
function SidebarFrame({ sidebar, header, footer, children }: ShellFrameProps) {
	return (
		<div className="flex min-h-screen bg-background text-foreground">
			<aside className="hidden w-56 shrink-0 flex-col gap-4 border-r p-4 lg:flex">
				{sidebar}
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center justify-end gap-3 border-b px-6 py-3">
					<SidebarDrawer sidebar={sidebar} />
					{header}
				</header>
				<main className="min-w-0 flex-1">{children}</main>
				{footer && <footer>{footer}</footer>}
			</div>
		</div>
	);
}

/**
 * Topbar layout: one horizontal bar holds the nav inline on wide screens
 * (the `[&>*]:contents` lets the sidebar tree's wrapper collapse so its
 * logo + nav become bar items). On mobile the same nav drops into the
 * burger drawer, identical to the sidebar layout.
 */
function TopbarFrame({ sidebar, header, footer, children }: ShellFrameProps) {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="flex items-center gap-4 border-b px-4 py-3 lg:px-6">
				<SidebarDrawer sidebar={sidebar} />
				<div className="hidden min-w-0 flex-1 items-center gap-6 lg:flex [&>*]:contents">
					{sidebar}
				</div>
				<div className="ml-auto flex items-center gap-3">{header}</div>
			</header>
			<main className="min-w-0 flex-1">{children}</main>
			{footer && <footer>{footer}</footer>}
		</div>
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
