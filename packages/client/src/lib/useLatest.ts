/**
 * One answer to "is this async result still the current one?".
 *
 * Two things supersede a result — an effect re-running/unmounting, and the user
 * starting a newer action — and each site used to guard only the one it hit,
 * on every exit path by hand. That is how a superseded reorder still notified
 * "reorder failed": the guard covered the rollback branch, not the success one.
 * Here the check lives inside `run`, so a superseded result reaches no branch.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";

export interface LatestHandlers<T> {
	onResult: (value: T) => void;
	/** Skipped for a superseded attempt, so a stale rejection cannot roll back newer state. */
	onError?: (err: unknown) => void;
}

export interface LatestRun {
	<T>(attempt: () => Promise<T>, handlers: LatestHandlers<T>): Promise<void>;
	/** Supersedes in-flight attempts without starting one (cleared value, closed picker). */
	cancel: () => void;
}

export function useLatest(): LatestRun {
	const generationRef = useRef(0);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			// A remount (StrictMode, `key` change) would otherwise let a
			// pre-unmount response match the fresh generation.
			generationRef.current += 1;
		};
	}, []);

	const run = useCallback(
		async <T>(attempt: () => Promise<T>, handlers: LatestHandlers<T>): Promise<void> => {
			const generation = ++generationRef.current;
			const isCurrent = () => mountedRef.current && generation === generationRef.current;
			try {
				const value = await attempt();
				if (isCurrent()) {
					handlers.onResult(value);
				}
			} catch (err: unknown) {
				if (isCurrent()) {
					handlers.onError?.(err);
				}
			}
		},
		[],
	);

	const cancel = useCallback(() => {
		generationRef.current += 1;
	}, []);

	return useMemo(() => Object.assign(run, { cancel }), [run, cancel]);
}
