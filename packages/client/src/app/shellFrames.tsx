import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { OrientationProvider } from "./chromeContext";
import { useDensity } from "./densityContext";
import { SidebarDrawer } from "./SidebarDrawer";
import { ShellMain } from "./shellMain";

export interface ShellFrameProps {
	sidebar: ReactNode;
	header: ReactNode;
	footer: ReactNode;
	children: ReactNode;
	/** Tailwind max-w class centering page content; full-bleed when absent. */
	maxWidth?: string;
}

/**
 * Default layout: persistent left sidebar, header strip, mobile drawer. The
 * sidebar is pinned to the viewport (sticky + full height) instead of
 * scrolling with the page; if its nav content overflows, the scrollbar
 * appears inside that content area, not on the whole aside.
 */
export function SidebarFrame({ sidebar, header, footer, children, maxWidth }: ShellFrameProps) {
	const density = useDensity();
	return (
		<div className="flex min-h-screen bg-background text-foreground">
			<aside
				className={cn(
					"sticky top-0 hidden h-screen shrink-0 flex-col gap-4 overflow-hidden border-r p-4 lg:flex",
					density === "compact" ? "w-48" : "w-56",
				)}
			>
				<div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b bg-background px-6 py-3">
					<SidebarDrawer sidebar={sidebar} />
					{header}
				</header>
				<ShellMain maxWidth={maxWidth}>{children}</ShellMain>
				{footer && <footer>{footer}</footer>}
			</div>
		</div>
	);
}

/**
 * Topbar layout: one horizontal bar holds the nav inline on wide screens.
 * The bar wraps the sidebar tree in a "horizontal" orientation so its nav
 * groups render as dropdowns; `[&>*]:contents` dissolves the tree's own
 * wrapper so its logo + nav flow as bar items. On mobile the same tree
 * drops into the burger drawer under the page-level "vertical" orientation
 * — stacked, identical to the sidebar layout.
 */
export function TopbarFrame({ sidebar, header, footer, children, maxWidth }: ShellFrameProps) {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background px-4 py-3 lg:px-6">
				<SidebarDrawer sidebar={sidebar} />
				<div className="hidden min-w-0 flex-1 items-center gap-6 lg:flex [&>*]:contents">
					<OrientationProvider orientation="horizontal">{sidebar}</OrientationProvider>
				</div>
				<div className="ml-auto flex items-center gap-3">{header}</div>
			</header>
			<ShellMain maxWidth={maxWidth}>{children}</ShellMain>
			{footer && <footer>{footer}</footer>}
		</div>
	);
}
