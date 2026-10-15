import { PanelLeftIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { Button } from "../ui/button";
import { LogoBlock } from "./chromeBlocks";
import { OrientationProvider } from "./chromeContext";
import { useDensity } from "./densityContext";
import { SidebarDrawer } from "./SidebarDrawer";
import type { ShellFrameProps } from "./shellFrames";
import { ShellMain } from "./shellMain";

/**
 * Full-width top bar with a sidebar beneath it (a "T" layout): brand and a
 * sidebar-collapse toggle sit at the bar's left, header actions at its
 * right. On desktop the toggle hides the sidebar; on mobile the sidebar
 * lives in the burger drawer instead.
 */
// New-gen shape: only the expanded sidebar's scroll zone maps onto an
// upstream part (`cn-sidebar-content`). The asides and the top bar are pure
// layout (sticky offsets, viewport height, width, border, z-index) that the
// preset does not own, and the sidebar holds a server-authored chrome tree,
// so there is no fixed header/footer split to tag. The collapsed aside hosts
// the rail-orientation dropdowns and is left as layout too.
export function TopbarSidebarFrame({
	sidebar,
	header,
	footer,
	children,
	maxWidth,
}: ShellFrameProps) {
	const t = useTranslation();
	const [collapsed, setCollapsed] = useState(false);
	const density = useDensity();

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
				<Button
					variant="ghost"
					size="icon-sm"
					// max-lg:hidden, not `hidden lg:inline-flex`: the latter collides with
					// Button's own `inline-flex` in tailwind-merge and drops it, leaving
					// the icon uncentred.
					className="max-lg:hidden"
					data-testid="sidebar-collapse"
					aria-label={t("nav.open_sidebar")}
					aria-pressed={collapsed}
					onClick={() => setCollapsed((prev) => !prev)}
				>
					<PanelLeftIcon aria-hidden />
				</Button>
				<SidebarDrawer sidebar={sidebar} />
				<LogoBlock />
				<div className="ml-auto flex items-center gap-2">{header}</div>
			</header>
			<div className="flex min-h-0 flex-1">
				{collapsed ? (
					<aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-14 shrink-0 flex-col items-center gap-4 overflow-y-auto border-r p-2 lg:flex">
						<OrientationProvider orientation="rail">{sidebar}</OrientationProvider>
					</aside>
				) : (
					<aside
						className={cn(
							"sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col gap-4 overflow-hidden border-r p-4 lg:flex",
							density === "compact" ? "w-48" : "w-56",
						)}
					>
						<div
							className="cn-sidebar-content flex min-h-0 flex-1 flex-col overflow-y-auto"
							data-slot="sidebar-content"
						>
							{sidebar}
						</div>
					</aside>
				)}
				<ShellMain maxWidth={maxWidth}>{children}</ShellMain>
			</div>
			{footer && <footer>{footer}</footer>}
		</div>
	);
}
