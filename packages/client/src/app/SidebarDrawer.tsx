import { router } from "@inertiajs/react";
import { MenuIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { Button } from "../ui/button";
import { ResponsiveDialog, ResponsiveDialogContent } from "../ui/revola";

interface SidebarDrawerProps {
	/** The sidebar node — same tree rendered in the desktop <aside>. */
	sidebar: ReactNode;
}

/**
 * Mobile-only sidebar: a burger (lg:hidden) opens the sidebar in a
 * left-edge revola drawer; auto-closes on Inertia navigation.
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
			<Button
				variant="ghost"
				size="icon-sm"
				className="-ml-1 mr-auto lg:hidden"
				data-testid="sidebar-trigger"
				aria-label={t("nav.open_sidebar")}
				onClick={() => setOpen(true)}
			>
				<MenuIcon />
			</Button>
			<ResponsiveDialog onlyDrawer direction="left" open={open} onOpenChange={setOpen}>
				<ResponsiveDialogContent className="flex flex-col gap-4 overflow-y-auto rounded-lg border p-4">
					{sidebar}
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		</>
	);
}
