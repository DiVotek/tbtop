import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable debounced wrapper around `fn`.
 * Cancels any pending invocation on unmount.
 */
export function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fnRef = useRef(fn);
	fnRef.current = fn;

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return useCallback(
		(...args: Parameters<T>) => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				fnRef.current(...args);
			}, ms);
		},
		[ms],
	) as T;
}
