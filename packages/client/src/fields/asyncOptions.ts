import { useEffect, useRef, useState } from "react";
import { useLatest } from "../lib/useLatest";
import type { ClientActionContext } from "../structure/types";
import type { StaticOption } from "./selectShared";

/** Every async options endpoint takes deps alongside its primary argument. */
type OptionsFetch<TArg, TResult> = (
	ctx: ClientActionContext,
	arg: TArg,
	deps?: Record<string, string>,
) => Promise<TResult>;

export interface AsyncOptionsBase {
	query?: OptionsFetch<string, unknown[]>;
	optionLabel?: (row: unknown) => string;
	optionValue?: (row: unknown) => string;
	/** Select-only: the whole option, so display survives the async path. */
	optionRow?: (row: unknown) => StaticOption;
}

export interface AsyncSingleOptionsBag extends AsyncOptionsBase {
	onLoad?: OptionsFetch<string, unknown>;
}

/** onLoad resolves the whole stored list in one call, so it answers with rows. */
export interface AsyncMultiOptionsBag extends AsyncOptionsBase {
	onLoad?: OptionsFetch<string[], unknown[]>;
}

/** Keyed by option value; carries the whole option so display survives resolution. */
export type OptionMap = Record<string, StaticOption>;

interface LabelCache {
	key: number | string;
	labels: OptionMap;
}

export type ResolvedState = { kind: "loading" } | { kind: "ready"; labels: OptionMap };

export interface ReadyLabels {
	kind: "ready";
	labels: OptionMap;
}

/** Identity doubles as the "never resolved yet" marker. */
export const EMPTY_LABELS: ReadyLabels = { kind: "ready", labels: {} };

/** An option the dropdown already showed, tagged with the deps it was seen under. */
export interface SeenLabel {
	option: StaticOption;
	depsKey: string;
}

export interface SingleResolveArgs {
	ctx: ClientActionContext;
	fieldName: string;
	value: string | null;
	opts: AsyncSingleOptionsBag;
	refetchKey?: number | string;
	/** Options the caller already holds (e.g. rows from query()); never re-resolved. */
	knownLabels?: OptionMap;
}

/**
 * Labels accumulate across value changes so re-selecting a row the dropdown
 * already listed doesn't blank the control. The cache belongs to one
 * refetchKey: new deps can map the same id to a different row.
 */
function useLabelCache(refetchKey: number | string, state: ResolvedState): { current: LabelCache } {
	const cacheRef = useRef<LabelCache>({ key: refetchKey, labels: {} });
	if (cacheRef.current.key !== refetchKey) {
		cacheRef.current = { key: refetchKey, labels: {} };
	} else if (state.kind === "ready") {
		cacheRef.current.labels = state.labels;
	}
	return cacheRef;
}

// oxlint-disable-next-line max-lines-per-function -- hook: effect + refs can't split without breaking hook rules
export function useSingleResolvedLabel({
	ctx,
	fieldName,
	value,
	opts,
	refetchKey = 0,
	knownLabels,
}: SingleResolveArgs): ResolvedState {
	const warnedRef = useRef(false);
	const ctxRef = useRef(ctx);
	ctxRef.current = ctx;
	const optsRef = useRef(opts);
	optsRef.current = opts;
	const id = value ?? "";
	const [state, setState] = useState<ResolvedState>(() =>
		id === "" ? { kind: "ready", labels: {} } : { kind: "loading" },
	);
	const cacheRef = useLabelCache(refetchKey, state);
	const knownRef = useRef(knownLabels);
	knownRef.current = knownLabels;
	const run = useLatest();

	useEffect(() => {
		const cached = cacheRef.current.labels;
		const known = { ...knownRef.current, ...cached };
		if (id === "" || known[id] !== undefined) {
			setState({ kind: "ready", labels: known });
			return;
		}
		const { onLoad } = optsRef.current;
		if (!onLoad) {
			warnMissingOnLoad(warnedRef, fieldName);
			setState({ kind: "ready", labels: cached });
			return;
		}
		setState({ kind: "loading" });
		void run(() => onLoad(ctxRef.current, id), {
			onResult: (row) =>
				setState({
					kind: "ready",
					labels: mergeLabel({ cached, id, row, opts: optsRef.current }),
				}),
			onError: () => setState({ kind: "ready", labels: cached }),
		});
		return () => {
			run.cancel();
		};
	}, [id, fieldName, refetchKey, cacheRef, run]);
	return state;
}

interface MergeLabelArgs {
	cached: OptionMap;
	id: string;
	row: unknown;
	opts: AsyncSingleOptionsBag;
}

function mergeLabel({ cached, id, row, opts }: MergeLabelArgs): OptionMap {
	const value = opts.optionValue ? String(opts.optionValue(row)) : id;
	return { ...cached, [value]: toOption(row, value, opts) };
}

/** optionRow carries display; optionLabel is the fallback for bags without it. */
function toOption(row: unknown, value: string, opts: AsyncOptionsBase): StaticOption {
	if (opts.optionRow) {
		return opts.optionRow(row);
	}
	return { value, label: opts.optionLabel ? opts.optionLabel(row) : value };
}

export function warnMissingOnLoad(warnedRef: { current: boolean }, fieldName: string): void {
	if (warnedRef.current) {
		return;
	}
	warnedRef.current = true;
	console.warn(
		`[tabletop] field ${fieldName}: async field has initial value but no onLoad — displaying raw value`,
	);
}

export function buildLabelMap(rows: unknown[], opts: AsyncOptionsBase): OptionMap {
	const labels: OptionMap = {};
	for (const row of rows) {
		if (!opts.optionValue) {
			continue;
		}
		const v = String(opts.optionValue(row));
		labels[v] = toOption(row, v, opts);
	}
	return labels;
}
