import { Head, usePage } from "@inertiajs/react";

interface FaviconProps {
	tbtop?: { favicon?: string | null };
	[key: string]: unknown;
}

/**
 * The panel's PanelConfig::favicon() as the tab icon. Rendered through Inertia's
 * <Head> like the page title, so it follows the panel on every visit; a panel
 * without one leaves the host's own icon alone.
 */
export function PanelFavicon() {
	const favicon = usePage<FaviconProps>().props.tbtop?.favicon;
	if (!favicon) {
		return null;
	}
	return (
		<Head>
			<link rel="icon" href={favicon} head-key="favicon" />
		</Head>
	);
}
