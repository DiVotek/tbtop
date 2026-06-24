import { useEffect, useRef } from "react";

/**
 * Calls `fn` every `intervalMs`, paused while the tab is hidden and fired
 * once on regaining visibility. A null/0 interval disables polling entirely
 * (the caller still fetches on mount/open). `fn` is read through a ref so
 * changing its identity never resets the timer.
 */
export function usePolling(fn: () => void, intervalMs: number | null | undefined): void {
	const fnRef = useRef(fn);
	fnRef.current = fn;

	useEffect(() => {
		if (!intervalMs || intervalMs <= 0) {
			return;
		}
		let timer: ReturnType<typeof setInterval> | undefined;
		const stop = () => {
			if (timer !== undefined) {
				clearInterval(timer);
				timer = undefined;
			}
		};
		const start = () => {
			stop();
			timer = setInterval(() => fnRef.current(), intervalMs);
		};
		const onVisibility = () => {
			if (document.hidden) {
				stop();
				return;
			}
			fnRef.current();
			start();
		};
		start();
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [intervalMs]);
}
