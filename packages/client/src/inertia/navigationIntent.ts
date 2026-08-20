/**
 * A one-shot flag that marks the next Inertia navigation as server-initiated
 * (a redirect effect from AdminPage's flash handling, not a link click or
 * back/forward the user triggered themselves).
 *
 * Why this exists: after a successful form save, the server's response can
 * carry a redirect effect (a plain GET router.visit). The unsaved-changes
 * guard (useUnsavedGuard) resets its own idea of "dirty" from the form
 * controller's isDirty, which is cleared by a separate setState in
 * router.post's onSuccess callback. That reset and the flash-driven redirect
 * are two independently-scheduled updates — in a real browser there is no
 * guarantee the reset's re-render commits before the redirect's router.visit
 * fires, so the guard can still see isDirty=true and pop a confirm dialog
 * right after a successful save.
 *
 * The real fix is semantic: a redirect the server told us to make is an
 * intentional navigation, not an accidental page leave — it should never be
 * subject to the unsaved-changes guard, regardless of ordering. applyRedirect
 * marks the flag immediately before calling router.visit; useUnsavedGuard's
 * 'before' handler consumes it first, before ever looking at isDirty.
 */
let serverRedirectPending = false;
let serverRedirectVisit: object | null = null;

/** Call immediately before router.visit() for a server-authored redirect effect. */
export function markServerRedirect(): void {
	serverRedirectPending = true;
}

/**
 * Visit-scoped read: the first guard consumes the pending flag and associates
 * it with this visit; other guards handling the same synchronous event can
 * observe it too. The association expires in a microtask and uses identity,
 * so it cannot wave through a different navigation.
 */
export function consumeServerRedirect(visit?: object): boolean {
	if (visit && visit === serverRedirectVisit) {
		return true;
	}
	const pending = serverRedirectPending;
	serverRedirectPending = false;
	serverRedirectVisit = pending && visit ? visit : null;
	if (serverRedirectVisit) {
		queueMicrotask(() => {
			serverRedirectVisit = null;
		});
	}
	return pending;
}
