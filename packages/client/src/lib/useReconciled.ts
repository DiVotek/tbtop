/**
 * One answer to "did the incoming value actually change?".
 *
 * A local draft (a cell being edited, a search box, a dragged row order) has to
 * yield to a new server value but survive a re-render that merely delivers a
 * fresh object with the same contents. Identity alone is not the signal: every
 * Inertia props refresh re-materializes the tree, so an identity check resets
 * the user's edits; a value check alone re-runs work on unrelated re-renders.
 *
 * Callers keep their own domain rule about *whether* to yield (a dirty cell
 * ignores an unrelated refetch); this module owns only the change detection.
 */
import { useRef } from "react";

export interface ReconcileOptions<T> {
	/** Defaults to Object.is. Pass a value comparison when a fresh object may be equal. */
	isEqual?: (a: T, b: T) => boolean;
	/** Extra identity: a change here counts as a change even when the value compares equal. */
	key?: string;
}

export interface Reconciled {
	/** True on the render where `incoming` (or `key`) differs from what was last accepted. */
	changed: boolean;
	/** True when `key` changed — the caller's signal to drop a draft unconditionally. */
	keyChanged: boolean;
	/** Marks `incoming` as accepted, so `changed` is false until it differs again. */
	accept: () => void;
}

export function useReconciled<T>(incoming: T, options: ReconcileOptions<T> = {}): Reconciled {
	const equals = options.isEqual ?? Object.is;
	const acceptedRef = useRef<{ value: T; key: string | undefined }>({
		value: incoming,
		key: options.key,
	});
	const seededRef = useRef(false);

	const keyChanged = seededRef.current && acceptedRef.current.key !== options.key;
	const valueChanged = seededRef.current && !equals(acceptedRef.current.value, incoming);
	seededRef.current = true;

	return {
		changed: keyChanged || valueChanged,
		keyChanged,
		accept: () => {
			acceptedRef.current = { value: incoming, key: options.key };
		},
	};
}
