import { useRef, useState } from "react";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { useMultiResolvedLabels } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { FieldFormProps } from "./fieldProps";
import { ComboboxOption, MultiComboboxShell, matchesQuery } from "./selectMultiShell";
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

	function staticGetLabel(v: string): string {
		return choices.find((o) => o.value === v)?.label ?? v;
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
			getLabel={staticGetLabel}
		>
			{(query) => {
				const filtered = choices.filter((o) => matchesQuery(o.label, query));
				return {
					exactMatch: filtered.some(
						(o) => o.label.toLowerCase() === query.trim().toLowerCase(),
					),
					nodes: filtered.map((opt) => (
						<ComboboxOption key={opt.value} value={opt.value} label={opt.label} />
					)),
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
	const search = useAsyncSearch(ctx, opts.query, query);
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

	const resolvedLabels = resolved.kind === "ready" ? resolved.labels : {};
	const create = opts.create as SelectCreateConfig | undefined;

	// When onLoad is present, hide chips for values whose labels didn't resolve
	// (partial onLoad results — preserves the original toggle-button behavior).
	const visibleValues =
		opts.onLoad !== undefined ? current.filter((v) => v in resolvedLabels) : current;

	// During a query-driven refetch, show an empty list inside the popup.
	const searchRows =
		search.kind === "ready"
			? search.rows.map((row) => ({
					value: String(opts.optionValue?.(row) ?? ""),
					label: String(opts.optionLabel?.(row) ?? ""),
				}))
			: [];

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
			getLabel={(v) => resolvedLabels[v] ?? v}
			resolvedLabels={resolvedLabels}
			onQueryChange={setQuery}
		>
			{() => ({
				exactMatch: searchRows.some(
					(r) => r.label.toLowerCase() === query.trim().toLowerCase(),
				),
				nodes: searchRows.map((r) => (
					<ComboboxOption key={r.value} value={r.value} label={r.label} />
				)),
			})}
		</MultiComboboxShell>
	);
}

export type { StaticOption };
