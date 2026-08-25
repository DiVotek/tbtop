import { useEffect, useRef, useState } from "react";
import { useLatest } from "../lib/useLatest";
import type { ClientActionContext } from "../structure/types";

type SearchState =
	| { kind: "loading" }
	| { kind: "ready"; rows: unknown[] }
	| { kind: "error"; message: string };

type QueryFn = (ctx: ClientActionContext, search: string) => Promise<unknown[]>;

// Swallows the pauses inside a typed word without the list reading as laggy.
const SEARCH_DEBOUNCE_MS = 300;

export interface AsyncSearchArgs {
	ctx: ClientActionContext;
	query: QueryFn | undefined;
	search: string;
	/** Bump to force a refetch with the same search (e.g. after create, or deps change). */
	refetchKey?: number | string;
}

export function useAsyncSearch({
	ctx,
	query,
	search,
	refetchKey = 0,
}: AsyncSearchArgs): SearchState {
	const debouncedSearch = useDebounced(search);
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;
	const queryRef = useRef(query);
	queryRef.current = query;
	const hasQuery = query !== undefined;
	const [state, setState] = useState<SearchState>(() =>
		hasQuery ? { kind: "loading" } : { kind: "ready", rows: [] },
	);
	const run = useLatest();
	// biome-ignore lint/correctness/useExhaustiveDependencies: hasQuery/refetchKey trigger refetch
	useEffect(() => {
		const fn = queryRef.current;
		if (!fn) {
			setState({ kind: "ready", rows: [] });
			return;
		}
		setState({ kind: "loading" });
		void run(() => fn(ctxRef.current, debouncedSearch), {
			onResult: (rows) => setState({ kind: "ready", rows }),
			onError: (err) =>
				setState({
					kind: "error",
					message: err instanceof Error ? err.message : "Query failed",
				}),
		});
		return () => {
			run.cancel();
		};
	}, [hasQuery, debouncedSearch, refetchKey, run]);
	return state;
}

/** Mount and empty-again pass through instantly; only typing is delayed. */
function useDebounced(value: string): string {
	const [debounced, setDebounced] = useState(value);
	const isFirst = useRef(true);
	useEffect(() => {
		if (isFirst.current || value === "") {
			isFirst.current = false;
			setDebounced(value);
			return;
		}
		const timer = setTimeout(() => setDebounced(value), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [value]);
	return debounced;
}
