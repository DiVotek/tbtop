import { type ReactNode, useRef, useState } from "react";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import type { AsyncOptionsBase, OptionMap } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { DependencyState } from "./fieldDependencies";
import { ComboboxOption } from "./selectMultiOption";
import { SingleComboboxShell, type SingleListState } from "./selectSingleShell";

/**
 * Combobox rendering shared by every field that resolves its options from an
 * endpoint (select `query()`, relation search). `useRemoteOptions` already
 * unifies the fetch/label protocol; this owns what both callers indepen-
 * dently re-implemented on top of it: run the (debounced, dep-gated) search,
 * keep the control mounted through a refetch, and turn rows into listed
 * `ComboboxOption`s.
 */
export interface AsyncOptionComboboxProps<TBag extends AsyncOptionsBase> {
	id?: string;
	name: string;
	value: string | null;
	onChange: (next: string | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	invalid?: boolean;
	/** query/optionValue/optionLabel/optionRow, already bound with parent deps. */
	opts: TBag;
	/** The current value's resolved label, from useRemoteOptions. */
	labels: OptionMap;
	dep: DependencyState;
	/** Bump to force a refetch with the same search (e.g. after a create). */
	refetchKey?: number | string;
	/** Feed back the rows this dropdown listed so picking one needs no re-resolve. */
	onRowsSeen: (rows: OptionMap) => void;
	loading?: ReactNode;
	error?: ReactNode | ((err: Error) => ReactNode);
}

export function AsyncOptionCombobox<TBag extends AsyncOptionsBase>({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	opts,
	labels,
	dep,
	refetchKey,
	onRowsSeen,
	loading,
	error,
}: AsyncOptionComboboxProps<TBag>) {
	const ctx = useClientActionContext();
	const isGated = dep.hasDeps && !dep.ready;
	const [query, setQuery] = useState("");
	const search = useAsyncSearch({
		ctx,
		query: isGated ? undefined : opts.query,
		search: query,
		refetchKey: refetchKey === undefined ? dep.depsKey : `${refetchKey}:${dep.depsKey}`,
	});
	// Only the first load has nothing to show. Later refetches — typing, a
	// selection resetting the query, a create — keep the control mounted so it
	// never blinks through a skeleton and never drops the text being typed.
	const hasRenderedRef = useRef(false);

	if (search.kind === "loading" && !hasRenderedRef.current) {
		return <>{loading ?? <FormSkeleton />}</>;
	}
	// A failure before anything rendered has no control to fall back to.
	// Afterwards the shell stays: unmounting it removes the input, and with it
	// the only way to change the search and retry.
	if (search.kind === "error" && !hasRenderedRef.current) {
		return <>{renderAsyncError(error, search.message, <FormSkeleton />)}</>;
	}
	hasRenderedRef.current = true;

	const rows: unknown[] = isGated || search.kind !== "ready" ? [] : search.rows;
	const listed: OptionMap = {};
	for (const row of rows) {
		const v = String(opts.optionValue?.(row) ?? "");
		listed[v] = opts.optionRow?.(row) ?? { value: v, label: opts.optionLabel?.(row) ?? v };
	}
	onRowsSeen(listed);

	// A pending refetch keeps the previous rows rather than blanking the list.
	let listState: SingleListState = "rows";
	if (search.kind === "error") {
		listState = "failed";
	} else if (search.kind === "ready" && Object.keys(listed).length === 0) {
		listState = "empty";
	}
	// An empty string is "nothing selected", not an option labelled "".
	const hasValue = value !== null && value !== "";
	const selected = hasValue ? (labels[value] ?? { value, label: value }) : undefined;

	return (
		<SingleComboboxShell
			id={id}
			name={name}
			value={value}
			selected={selected}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			invalid={invalid}
			onQueryChange={setQuery}
			listState={listState}
		>
			{Object.entries(listed).map(([v, option]) => (
				<ComboboxOption key={v} option={option} />
			))}
		</SingleComboboxShell>
	);
}
