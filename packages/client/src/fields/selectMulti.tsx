import { useRef, useState } from "react";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { type OptionMap, useMultiResolvedLabels } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { FieldFormProps } from "./fieldProps";
import { ComboboxOption, matchesQuery } from "./selectMultiOption";
import { MultiComboboxShell } from "./selectMultiShell";
import type {
	SelectCreateConfig,
	SelectMultiOptionsBag,
	SelectOptionsBag,
	SelectValueType,
	StaticOption,
} from "./selectShared";

export function SelectMultiForm(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = props.options ?? {};
	if (opts.query) {
		return <AsyncMultiCombobox {...props} />;
	}
	return <StaticMultiCombobox {...props} />;
}

function StaticMultiCombobox(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const { id, name, value, onChange, onBlur, disabled, options } = props;
	const choices = options?.options ?? [];
	const current = Array.isArray(value) ? value : [];
	const create = options?.create as SelectCreateConfig | undefined;
	// Created options aren't in `choices`; stash them so chips show names, not ids.
	const resolvedLabels = useRef<OptionMap>({}).current;

	function staticGetOption(v: string): StaticOption {
		return choices.find((o) => o.value === v) ?? resolvedLabels[v] ?? { value: v, label: v };
	}

	return (
		<MultiComboboxShell
			id={id}
			name={name}
			value={current}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			create={create}
			getOption={staticGetOption}
			resolvedLabels={resolvedLabels}
		>
			{(query) => {
				const filtered = choices.filter((o) => matchesQuery(o.label, query));
				return {
					exactMatch: filtered.some(
						(o) => o.label.toLowerCase() === query.trim().toLowerCase(),
					),
					nodes: filtered.map((opt) => <ComboboxOption key={opt.value} option={opt} />),
				};
			}}
		</MultiComboboxShell>
	);
}

function AsyncMultiCombobox(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = (props.options ?? {}) as SelectMultiOptionsBag;
	const ctx = useClientActionContext();
	const current = Array.isArray(props.value) ? props.value : [];
	const resolved = useMultiResolvedLabels({ ctx, fieldName: props.name, value: current, opts });
	const [query, setQuery] = useState("");
	const [refetchKey, setRefetchKey] = useState(0);
	const search = useAsyncSearch({ ctx, query: opts.query, search: query, refetchKey });
	/** Options this dropdown has listed, so a selection keeps its label. */
	const seenRows = useRef<OptionMap>({});
	// Track whether the shell has rendered at least once with ready search results.
	// After initial render, query-driven refetches keep the shell mounted.
	const hasRenderedRef = useRef(false);

	// Initial load: both resolved labels AND search results must be ready.
	const isInitialLoad =
		!hasRenderedRef.current && (resolved.kind === "loading" || search.kind === "loading");

	if (isInitialLoad) {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	// Real query error (not a transient loading state) surfaces after initial render.
	if (search.kind === "error") {
		return <>{renderAsyncError(opts.error, search.message, <FormSkeleton />)}</>;
	}

	// Shell is now rendering — mark it.
	hasRenderedRef.current = true;

	const create = opts.create as SelectCreateConfig | undefined;

	// During a query-driven refetch, show an empty list inside the popup.
	const searchRows: StaticOption[] =
		search.kind === "ready"
			? search.rows.map((row) => {
					const value = String(opts.optionValue?.(row) ?? "");
					return (
						opts.optionRow?.(row) ?? { value, label: opts.optionLabel?.(row) ?? value }
					);
				})
			: [];
	// A listed row carries its own label, so picking it needs no re-resolve.
	// Without this a fresh pick is missing from onLoad's map and its chip vanishes.
	for (const row of searchRows) {
		seenRows.current[row.value] = row;
	}
	const resolvedLabels = {
		...seenRows.current,
		...(resolved.kind === "ready" ? resolved.labels : {}),
	};

	// A value with no label from either source stays hidden:
	// a chip showing a raw id is worse than no chip.
	const visibleValues =
		opts.onLoad !== undefined ? current.filter((v) => v in resolvedLabels) : current;

	return (
		<MultiComboboxShell
			id={props.id}
			name={props.name}
			value={current}
			visibleValues={visibleValues}
			onChange={props.onChange}
			onBlur={props.onBlur}
			disabled={props.disabled}
			create={create}
			getOption={(v) => resolvedLabels[v] ?? { value: v, label: v }}
			resolvedLabels={resolvedLabels}
			onCreated={() => setRefetchKey((k) => k + 1)}
			onQueryChange={setQuery}
		>
			{() => ({
				exactMatch: searchRows.some(
					(r) => r.label.toLowerCase() === query.trim().toLowerCase(),
				),
				nodes: searchRows.map((r) => <ComboboxOption key={r.value} option={r} />),
			})}
		</MultiComboboxShell>
	);
}

export type { StaticOption };
