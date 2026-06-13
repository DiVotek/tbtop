import type { ReactNode } from "react";

interface CenterLayoutProps {
	children: ReactNode;
}

/**
 * Chrome-less layout: full-viewport container with content centered
 * both horizontally and vertically. No sidebar, header, footer, or nav.
 */
export function CenterLayout({ children }: CenterLayoutProps) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background text-foreground">
			{children}
		</div>
	);
}
