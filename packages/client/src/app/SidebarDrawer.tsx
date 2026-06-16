import { router } from "@inertiajs/react";
import { MenuIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { ResponsiveDialog, ResponsiveDialogContent } from "../ui/revola";

interface SidebarDrawerProps {
	/** The sidebar node — same tree rendered in the desktop <aside>. */
	sidebar: ReactNode;
}

/**
 * Mobile-only sidebar: a burger button (lg:hidden) that opens the sidebar in a
 * left-edge drawer. Reuses the shared revola primitive (vaul + Radix) so no new
 * deps. Auto-closes on Inertia navigation, guarded so it no-ops when the shell
 * renders outside an Inertia app (e.g. AdminLayoutShell unit tests).
 */
export function SidebarDrawer({ sidebar }: SidebarDrawerProps) {
	const t = useTranslation();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		// Guard: outside an Inertia app `router.on` may be unavailable. No-op cleanly.
		if (typeof router?.on !== "function") {
			return;
		}
		const off = router.on("navigate", () => setOpen(false));
		return off;
	}, []);

	return (
		<>
			<button
				type="button"
				className="-ml-1 mr-auto inline-flex items-center justify-center rounded-md p-2 hover:bg-accent lg:hidden"
				data-testid="sidebar-trigger"
				aria-label={t("nav.open_sidebar")}
				onClick={() => setOpen(true)}
			>
				<MenuIcon className="size-5" />
			</button>
			<ResponsiveDialog onlyDrawer direction="left" open={open} onOpenChange={setOpen}>
				<ResponsiveDialogContent className="flex flex-col gap-4 overflow-y-auto rounded-lg border p-4">
					{sidebar}
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
