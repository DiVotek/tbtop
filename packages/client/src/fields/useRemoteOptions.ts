import { useRef } from "react";
import { useClientActionContext } from "../structure/actionContext";
import {
	type AsyncSingleOptionsBag,
	EMPTY_LABELS,
	type OptionMap,
	type ReadyLabels,
	type SeenLabel,
	useSingleResolvedLabel,
} from "./asyncOptions";
import {
	type DependencyConfig,
	type DependencyState,
	useFieldDependencies,
} from "./fieldDependencies";

export interface RemoteOptionsArgs<TBag extends AsyncSingleOptionsBag & DependencyConfig> {
	name: string;
	value: string | null;
	opts: TBag;
	onChange: (next: string | null) => void;
}

export interface RemoteOptionsState<TBag> {
	/** The bag with deps bound into query/onLoad — pass this on, never the raw one. */
	opts: TBag;
	dep: DependencyState;
	/** Parents are declared but not all filled: list nothing, resolve nothing. */
	isGated: boolean;
	/** Nothing has ever resolved, so there is no previous label to hold on screen. */
	isFirstLoad: boolean;
	labels: OptionMap;
	/** Feed back the rows a dropdown listed so picking one needs no re-resolve. */
	noteRowsSeen: (rows: OptionMap) => void;
}

/**
 * The protocol every field that loads its options from an endpoint needs: bind
 * the parent deps, hold the resolve until they are ready, remember the rows the
 * dropdown listed, and keep the last resolved label on screen while the next
 * one loads.
 *
 * Scalar values only. The multi path resolves a whole set in one call and
 * shares only types with this one — see asyncMultiOptions.
 */
export function useRemoteOptions<TBag extends AsyncSingleOptionsBag & DependencyConfig>({
	name,
	value,
	opts,
	onChange,
}: RemoteOptionsArgs<TBag>): RemoteOptionsState<TBag> {
	const ctx = useClientActionContext();
	const dep = useFieldDependencies({ name, config: opts, value, onChange });
	const isGated = dep.hasDeps && !dep.ready;
	const bound = dep.hasDeps ? bindDeps(opts, dep.deps) : opts;

	// Rows the dropdown listed already carry their labels; feeding them back
	// stops a selection from re-resolving a label we just displayed. Each entry
	// records the deps it was seen under, so new deps never reuse an old label.
	const seenRef = useRef<Record<string, SeenLabel>>({});
	const knownLabels: OptionMap = {};
	for (const [rowValue, seen] of Object.entries(seenRef.current)) {
		if (seen.depsKey === dep.depsKey) {
			knownLabels[rowValue] = seen.option;
		}
	}

	const resolved = useSingleResolvedLabel({
		ctx,
		fieldName: name,
		value: isGated ? null : value,
		opts: bound,
		refetchKey: dep.depsKey,
		knownLabels,
	});

	// Only the very first resolve has nothing to show. A re-resolve keeps the
	// last labels so changing the value never blinks through a skeleton.
	const lastReady = useRef<ReadyLabels>(EMPTY_LABELS);
	if (resolved.kind === "ready") {
		lastReady.current = resolved;
	}

	return {
		opts: bound,
		dep,
		isGated,
		isFirstLoad: resolved.kind === "loading" && lastReady.current === EMPTY_LABELS,
		labels: lastReady.current.labels,
		noteRowsSeen: (rows) => {
			for (const [rowValue, option] of Object.entries(rows)) {
				seenRef.current[rowValue] = { option, depsKey: dep.depsKey };
			}
		},
	};
}

function bindDeps<TBag extends AsyncSingleOptionsBag>(
	opts: TBag,
	deps: Record<string, string>,
): TBag {
	const { query, onLoad } = opts;
	return {
		...opts,
		query: query ? (ctx, search) => query(ctx, search, deps) : undefined,
		onLoad: onLoad ? (ctx, value) => onLoad(ctx, value, deps) : undefined,
	};
}
