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

/** Call immediately before router.visit() for a server-authored redirect effect. */
export function markServerRedirect(): void {
	serverRedirectPending = true;
}

/**
 * One-shot read: returns whether a server redirect is pending and clears the
 * flag. Must be called for every 'before' event (not just GET ones) so a
 * mark left set by a redirect that never reached the guard (e.g. no form on
 * the page) doesn't leak into and silently wave through a later, unrelated
 * navigation.
 */
export function consumeServerRedirect(): boolean {
	const pending = serverRedirectPending;
	serverRedirectPending = false;
	return pending;
}
