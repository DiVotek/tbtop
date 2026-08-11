import { useRef, useState } from "react";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import type { AsyncSingleOptionsBag, OptionMap } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import { nullableCell } from "./cellHelpers";
import type { DependencyConfig, DependencyState } from "./fieldDependencies";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { type AffixOptions, InputGroup } from "./inputGroup";
import { ComboboxOption } from "./selectMultiOption";
import { coerceSelectValue } from "./selectShared";
import { SingleComboboxShell, type SingleListState } from "./selectSingleShell";
import { useRemoteOptions } from "./useRemoteOptions";

export interface RelationOptionsBag extends AsyncSingleOptionsBag, DependencyConfig, AffixOptions {
	searchable?: boolean;
	labelKey?: string;
}

export function RelationCell({ value }: FieldCellProps<unknown>) {
	return nullableCell(value, (v) => {
		if (Array.isArray(v)) {
			return <span>{v.length} items</span>;
		}
		if (typeof v === "object" && v !== null) {
			return <span>{relationObjectLabel(v)}</span>;
		}
		return <span>{String(v)}</span>;
	});
}

/** Pull a display label from an eager-loaded related record, else its id, else raw JSON. */
function relationObjectLabel(obj: object): string {
	if ("name" in obj && typeof obj.name === "string") {
		return obj.name;
	}
	if ("label" in obj && typeof obj.label === "string") {
		return obj.label;
	}
	if ("title" in obj && typeof obj.title === "string") {
		return obj.title;
	}
	if ("id" in obj && (typeof obj.id === "string" || typeof obj.id === "number")) {
		return String(obj.id);
	}
	return JSON.stringify(obj);
}

/**
 * A relation differs from an async single select only in which endpoint answers
 * it, so it renders through the same combobox and shares the same protocol.
 */
export function RelationForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	options,
}: FieldFormProps<string, RelationOptionsBag>) {
	const coerced = coerceSelectValue(value);
	const current = typeof coerced === "string" ? coerced : null;
	const remote = useRemoteOptions({
		name,
		value: current,
		opts: options ?? {},
		onChange,
	});

	if (remote.isFirstLoad) {
		return <FormSkeleton />;
	}

	return (
		<InputGroup
			options={options}
			disabled={disabled || remote.dep.disabledByParent}
			invalid={invalid}
		>
			<RelationSelectInner
				id={id}
				name={name}
				value={current}
				onChange={onChange}
				onBlur={onBlur}
				disabled={disabled || remote.dep.disabledByParent}
				invalid={invalid}
				options={remote.opts}
				labels={remote.labels}
				dep={remote.dep}
				isGated={remote.isGated}
				onRowsSeen={remote.noteRowsSeen}
			/>
		</InputGroup>
	);
}

interface RelationSelectInnerProps {
	id?: string;
	name: string;
	value: string | null;
	onChange: (next: string | null) => void;
	onBlur?: () => void;
	disabled?: boolean;
	invalid?: boolean;
	options: RelationOptionsBag;
	labels: OptionMap;
	dep: DependencyState;
	isGated: boolean;
	onRowsSeen: (rows: OptionMap) => void;
}

function RelationSelectInner({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	options,
	labels,
	dep,
	isGated,
	onRowsSeen,
}: RelationSelectInnerProps) {
	const ctx = useClientActionContext();
	const [query, setQuery] = useState("");
	const search = useAsyncSearch({
		ctx,
		query: isGated ? undefined : options.query,
		search: query,
		refetchKey: dep.depsKey,
	});
	// Only the first load has nothing to show. Later refetches — typing, a
	// selection resetting the query — keep the control mounted so it never
	// blinks through a skeleton and never drops the text being typed.
	const hasRenderedRef = useRef(false);

	if (search.kind === "loading" && !hasRenderedRef.current) {
		return <FormSkeleton />;
	}
	// A failure before anything rendered has no control to fall back to.
	// Afterwards the shell stays: unmounting it removes the input, and with it
	// the only way to change the search and retry.
	if (search.kind === "error" && !hasRenderedRef.current) {
		return <>{renderAsyncError(undefined, search.message, <FormSkeleton />)}</>;
	}
	hasRenderedRef.current = true;

	const rows: unknown[] = isGated || search.kind !== "ready" ? [] : search.rows;
	const listed: OptionMap = {};
	for (const row of rows) {
		const v = String(options.optionValue?.(row) ?? "");
		listed[v] = options.optionRow?.(row) ?? {
			value: v,
			label: options.optionLabel?.(row) ?? v,
		};
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
