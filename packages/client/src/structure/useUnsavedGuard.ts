import type { PendingVisit } from "@inertiajs/core";
import { router } from "@inertiajs/react";
import { useCallback, useEffect, useState } from "react";
import { consumeServerRedirect } from "../inertia/navigationIntent";

/**
 * A cancelled Inertia visit, captured so it can be replayed verbatim if the
 * user confirms "Leave". Only the fields router.visit's options accept are
 * kept — the rest of PendingVisit (completed/cancelled/interrupted/url as a
 * bookkeeping URL object) isn't needed to replay the navigation.
 */
export type PendingGuardVisit = Pick<
	PendingVisit,
	| "url"
	| "method"
	| "data"
	| "replace"
	| "preserveScroll"
	| "preserveState"
	| "only"
	| "except"
	| "headers"
>;

export interface UnsavedGuardState {
	/** Set while a navigation was cancelled and is awaiting the user's confirm/cancel. */
	pending: PendingGuardVisit | null;
	/** "Leave" — bypass the guard and replay the cancelled visit. */
	confirmLeave: () => void;
	/** "Stay" — dismiss the dialog, the cancelled visit is simply dropped. */
	cancelLeave: () => void;
}

/**
 * One-shot bypass for the replayed visit: confirmLeave() re-issues the
 * cancelled navigation through the same router.visit -> 'before' path this
 * guard listens on. Without this flag the replay would immediately see the
 * still-dirty form and cancel itself again, popping the same dialog in a loop.
 */
let leaveConfirmed = false;

function markLeaveConfirmed(): void {
	leaveConfirmed = true;
}

function consumeLeaveConfirmed(): boolean {
	const confirmed = leaveConfirmed;
	leaveConfirmed = false;
	return confirmed;
}

/**
 * Registers the unsaved-changes guard for Inertia client-side navigation when
 * `guardUnsaved` and `isDirty` are both true: cancels the visit and returns
 * it via `pending` so the caller can render an in-app confirm dialog (no
 * native window.confirm/beforeunload — those are jarring inside an admin
 * SPA and can't be styled or translated consistently with the rest of the UI).
 *
 * Tab-close/refresh protection (beforeunload) is intentionally not covered:
 * there is no in-app dialog for that channel, and a native one is exactly
 * what this guard exists to avoid — the browser's own "leave site?" prompt
 * for that channel is out of scope by design, not an oversight.
 */
export function useUnsavedGuard(isDirty: boolean, guardUnsaved: boolean): UnsavedGuardState {
	const [pending, setPending] = useState<PendingGuardVisit | null>(null);

	useEffect(() => {
		if (!guardUnsaved) {
			return;
		}
		return router.on("before", (event) => {
			// A server-authored redirect (AdminPage's flash effect) is never
			// subject to this guard, regardless of isDirty: it's the reset in
			// router.post's onSuccess racing the flash-driven router.visit as
			// two independently-scheduled updates, not a reliably-ordered pair,
			// so isDirty can still read true when this fires. Consumed before
			// the isDirty check (and for every navigation, not just GET) so the
			// one-shot flag can't outlive the redirect it was set for and
			// silently wave through a later, unrelated navigation.
			if (consumeServerRedirect()) {
				return;
			}
			// The user already confirmed "Leave" for this exact visit — let the
			// replay through instead of cancelling it again. Checked before the
			// method/isDirty gates (both still true on replay) but after the
			// server-redirect check, mirroring that flag's own ordering.
			if (consumeLeaveConfirmed()) {
				return;
			}
			// Only intercept GET navigation (page changes). POST/PATCH/DELETE
			// visits are form submissions — block those and the save button itself
			// would show the confirm dialog.
			const visit = event.detail.visit;
			if (visit.method !== "get") {
				return;
			}
			if (!isDirty) {
				return;
			}
			setPending(visit);
			return false;
		});
	}, [isDirty, guardUnsaved]);

	const confirmLeave = useCallback(() => {
		setPending((visit) => {
			if (visit) {
				markLeaveConfirmed();
				const { url, ...options } = visit;
				router.visit(url, options);
			}
			return null;
		});
	}, []);

	const cancelLeave = useCallback(() => setPending(null), []);

	return { pending, confirmLeave, cancelLeave };
}
