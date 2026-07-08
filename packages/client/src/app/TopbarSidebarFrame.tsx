import { PanelLeftIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { LogoBlock } from "./chromeBlocks";
import { SidebarDrawer } from "./SidebarDrawer";
import type { ShellFrameProps } from "./shellFrames";
import { ShellMain } from "./shellMain";

/**
 * Full-width top bar with a sidebar beneath it (a "T" layout): brand and a
 * sidebar-collapse toggle sit at the bar's left, header actions at its
 * right. On desktop the toggle hides the sidebar; on mobile the sidebar
 * lives in the burger drawer instead.
 */
export function TopbarSidebarFrame({
	sidebar,
	header,
	footer,
	children,
	maxWidth,
}: ShellFrameProps) {
	const t = useTranslation();
	const [collapsed, setCollapsed] = useState(false);

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
				<button
					type="button"
					className="hidden size-9 items-center justify-center rounded-md hover:bg-accent lg:inline-flex"
					data-testid="sidebar-collapse"
					aria-label={t("nav.open_sidebar")}
					aria-pressed={collapsed}
					onClick={() => setCollapsed((prev) => !prev)}
				>
					<PanelLeftIcon className="size-4" aria-hidden />
				</button>
				<SidebarDrawer sidebar={sidebar} />
				<LogoBlock />
				<div className="ml-auto flex items-center gap-2">{header}</div>
			</header>
			<div className="flex min-h-0 flex-1">
				{!collapsed && (
					<aside className="hidden w-56 shrink-0 flex-col gap-4 border-r p-4 lg:flex">
						{sidebar}
					</aside>
				)}
				<ShellMain maxWidth={maxWidth}>{children}</ShellMain>
			</div>
			{footer && <footer>{footer}</footer>}
		</div>
	);
}
