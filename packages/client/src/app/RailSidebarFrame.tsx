import { cn } from "../lib/cn";
import { OrientationProvider, useChromeData } from "./chromeContext";
import { useDensity } from "./densityContext";
import { ActiveGroupPanel } from "./railNav";
import { SidebarDrawer } from "./SidebarDrawer";
import type { ShellFrameProps } from "./shellFrames";
import { ShellMain } from "./shellMain";

/**
 * Rail + sidebar layout: the sidebar chrome tree renders in an icon-wide
 * rail (its navMenu as group icons), the active group's items fill the
 * column beside it, and the header sits over the page. On mobile the same
 * tree drops into the burger drawer as an icon row above the group's list.
 */
export function RailSidebarFrame({ sidebar, header, footer, children, maxWidth }: ShellFrameProps) {
	const density = useDensity();
	const { activeGroup } = useChromeData();
	return (
		<div className="flex min-h-screen bg-background text-foreground">
			<aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-4 overflow-y-auto border-r py-4 lg:flex">
				<OrientationProvider orientation="rail-sidebar">{sidebar}</OrientationProvider>
			</aside>
			{activeGroup !== undefined && (
				<aside
					className={cn(
						"sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-r p-4 lg:block",
						density === "compact" ? "w-48" : "w-56",
					)}
				>
					<ActiveGroupPanel />
				</aside>
			)}
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b bg-background px-6 py-3">
					<SidebarDrawer
						sidebar={
							<OrientationProvider orientation="rail-drawer">
								{sidebar}
							</OrientationProvider>
						}
					/>
					{header}
				</header>
				<ShellMain maxWidth={maxWidth}>{children}</ShellMain>
				{footer && <footer>{footer}</footer>}
			</div>
		</div>
	);
}
