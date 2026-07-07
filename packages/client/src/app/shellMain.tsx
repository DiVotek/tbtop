import type { ReactNode } from "react";

/** Page content area, optionally centered to a max-width (PanelConfig::maxContentWidth). */
export function ShellMain({ children, maxWidth }: { children: ReactNode; maxWidth?: string }) {
	return (
		<main className="min-w-0 flex-1">
			{maxWidth ? <div className={`mx-auto w-full ${maxWidth}`}>{children}</div> : children}
		</main>
	);
}
