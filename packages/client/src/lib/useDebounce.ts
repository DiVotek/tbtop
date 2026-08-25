import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** A debounced wrapper around the original function, plus an escape hatch to drop a pending call. */
export type Debounced<T extends (...args: Parameters<T>) => void> = T & {
	/** Drops a pending invocation without running it (e.g. an external reset supersedes it). */
	cancel: () => void;
};

/**
 * Returns a stable debounced wrapper around `fn`.
 * Cancels any pending invocation on unmount.
 */
export function useDebounce<T extends (...args: Parameters<T>) => void>(
	fn: T,
	ms: number,
): Debounced<T> {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fnRef = useRef(fn);
	fnRef.current = fn;

	const cancel = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	useEffect(() => cancel, [cancel]);

	const debounced = useCallback(
		(...args: Parameters<T>) => {
			cancel();
			timerRef.current = setTimeout(() => {
				timerRef.current = null;
				fnRef.current(...args);
			}, ms);
		},
		[ms, cancel],
	) as T;

	return useMemo(() => Object.assign(debounced, { cancel }), [debounced, cancel]);
}

/**
 * Returns a debounced echo of `value`. Built on the same timer as
 * `useDebounce`, for callers that need the settled value itself rather than
 * a debounced callback (e.g. driving a query from typed text).
 *
 * `isImmediate` lets a value bypass the delay — mount always does, since a
 * derived value (unlike a callback) must answer on first render rather than
 * park behind an initial timer.
 */
export function useDebouncedValue<T>(
	value: T,
	ms: number,
	isImmediate: (value: T) => boolean = () => false,
): T {
	const [debounced, setDebounced] = useState(value);
	const isFirst = useRef(true);
	const isImmediateRef = useRef(isImmediate);
	isImmediateRef.current = isImmediate;
	useEffect(() => {
		if (isFirst.current || isImmediateRef.current(value)) {
			isFirst.current = false;
			setDebounced(value);
			return;
		}
		const timer = setTimeout(() => setDebounced(value), ms);
		return () => clearTimeout(timer);
	}, [value, ms]);
	return debounced;
}
