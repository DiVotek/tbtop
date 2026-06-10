import { router } from "@inertiajs/react";
import { useEffect } from "react";
import type { Translate } from "../i18n/i18n";

/**
 * Registers two navigation guards when `guardUnsaved` is true and `isDirty` is true:
 *  1. `beforeunload` — warns when closing the tab or refreshing the page.
 *  2. `router.on('before')` — shows a confirm dialog for Inertia client-side navigation.
 *
 * Both guards use `window.confirm` with the i18n message so they can be tested
 * in happy-dom by stubbing `window.confirm`.
 */
export function useUnsavedGuard(isDirty: boolean, guardUnsaved: boolean, t: Translate): void {
	useEffect(() => {
		if (!guardUnsaved) {
			return;
		}

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!isDirty) {
				return;
			}
			e.preventDefault();
			// Legacy browser support: setting returnValue prevents the dialog from
			// being suppressed. Modern browsers show their own message regardless.
			e.returnValue = t("form.unsaved_guard.body");
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		const offBefore = router.on("before", (event) => {
			// Only intercept GET navigation (page changes). POST/PATCH/DELETE
			// visits are form submissions — block those and the save button itself
			// would show the confirm dialog.
			const method = (event as { detail?: { visit?: { method?: string } } }).detail?.visit
				?.method;
			if (method && method !== "get") {
				return;
			}
			if (!isDirty) {
				return;
			}
			const msg = `${t("form.unsaved_guard.title")}\n\n${t("form.unsaved_guard.body")}`;
			return window.confirm(msg);
		});

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			offBefore();
		};
	}, [isDirty, guardUnsaved, t]);
}
