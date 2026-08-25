import { useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { OptionMap } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { DependencyState } from "./fieldDependencies";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { InputGroup } from "./inputGroup";
import { SelectCreateDialog } from "./selectCreateDialog";
import { SelectMultiForm } from "./selectMulti";
import { ComboboxOption, matchesQuery } from "./selectMultiOption";
import { SelectOptionContent } from "./selectOptionContent";
import {
	coerceSelectValue,
	type SelectCreateConfig,
	type SelectOptionsBag,
	type SelectSingleOptionsBag,
	type SelectValueType,
	type StaticOption,
} from "./selectShared";
import { SingleComboboxShell, type SingleListState } from "./selectSingleShell";
import { useRemoteOptions } from "./useRemoteOptions";

export function SelectCell({ value, options }: FieldCellProps<SelectValueType, SelectOptionsBag>) {
	const coerced = coerceSelectValue(value);
	if (coerced === null) {
		return null;
	}
	if (Array.isArray(coerced)) {
		const labels = coerced.map((v) => labelForStatic(v, options?.options));
		return <span>{labels.join(", ")}</span>;
	}
	return <span>{labelForStatic(coerced, options?.options)}</span>;
}

function labelForStatic(value: string, choices: StaticOption[] | undefined): string {
	const match = choices?.find((o) => o.value === value);
	return match?.label ?? value;
}

export function SelectForm(rawProps: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const props = { ...rawProps, value: coerceSelectValue(rawProps.value) };
	const opts = props.options ?? {};
	if (opts.multiple === true) {
		return (
			<InputGroup options={opts} disabled={props.disabled} invalid={props.invalid}>
				<SelectMultiForm {...props} />
			</InputGroup>
		);
	}
	if (opts.query) {
		return <AsyncSingleSelectWithCreate {...props} />;
	}
	if (opts.searchable && !opts.query) {
		return <SearchableStaticSelectWithCreate {...props} />;
	}
	return <StaticSingleSelectWithCreate {...props} />;
}

// ─── Create affordance wrapper ────────────────────────────────────────────────

interface WithCreateProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolvedLabels?: OptionMap;
	onCreated?: () => void;
	children: React.ReactNode;
}

function WithCreateAffordance({
	name,
	onChange,
	disabled,
	invalid,
	options,
	resolvedLabels,
	onCreated,
	children,
}: WithCreateProps) {
	const [open, setOpen] = useState(false);
	const t = useTranslation();
	const create = options?.create as SelectCreateConfig | undefined;
	const control = (
		<InputGroup options={options} disabled={disabled} invalid={invalid}>
			{children}
		</InputGroup>
	);
	if (!create) {
		return control;
	}

	function handleSuccess(value: string, label: string) {
		if (resolvedLabels) {
			resolvedLabels[value] = { value, label };
		}
		onChange(value);
		onCreated?.();
		setOpen(false);
	}

	return (
		<div className="flex flex-col gap-1">
			{control}
			<button
				type="button"
				data-testid={`select-create-${name}`}
				disabled={disabled}
				onClick={() => !disabled && setOpen(true)}
				className="self-start text-xs text-primary underline"
			>
				+ {t("action.create")}
			</button>
			{open && (
				<SelectCreateDialog
					fieldName={name}
					config={create}
					onSuccess={handleSuccess}
					onClose={() => setOpen(false)}
				/>
			)}
		</div>
	);
}

// ─── Static single select ─────────────────────────────────────────────────────

function StaticSingleSelectWithCreate(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const resolvedLabels = useRef<OptionMap>({}).current;
	return (
		<WithCreateAffordance {...props} resolvedLabels={resolvedLabels}>
			<StaticSingleSelect {...props} resolvedLabels={resolvedLabels} />
		</WithCreateAffordance>
	);
}

interface StaticSelectProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolvedLabels?: OptionMap;
}

function StaticSingleSelect({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	options,
	resolvedLabels,
}: StaticSelectProps) {
	const t = useTranslation();
	const choices = options?.options ?? [];
	const current = asString(value);
	const created = current ? resolvedLabels?.[current] : undefined;
	// A created option isn't in `choices`; emit it so Radix can match + label it.
	const isUnlisted = created !== undefined && !choices.some((o) => o.value === current);
	const selectedOption = choices.find((o) => o.value === current) ?? created;
	return (
		<Select
			value={current}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			disabled={disabled}
		>
			<SelectTrigger
				id={fieldId({ id, name })}
				onBlur={onBlur}
				aria-invalid={invalid || undefined}
				data-testid={`select-${name}`}
				className="w-full"
			>
				<SelectValue placeholder={t("field.select.placeholder")}>
					{selectedOption && (
						<SelectOptionContent option={selectedOption} surface="inline" />
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{isUnlisted && created && (
					<SelectItem key={current} value={current} textValue={created.label}>
						<SelectOptionContent option={created} />
					</SelectItem>
				)}
				{choices.map((opt) => (
					<SelectItem key={opt.value} value={opt.value} textValue={opt.label}>
						<SelectOptionContent option={opt} />
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

// ─── Searchable static select ─────────────────────────────────────────────────

function SearchableStaticSelectWithCreate(
	props: FieldFormProps<SelectValueType, SelectOptionsBag>,
) {
	const resolvedLabels = useRef<OptionMap>({}).current;
	return (
		<WithCreateAffordance {...props} resolvedLabels={resolvedLabels}>
			<SearchableStaticSelect {...props} resolvedLabels={resolvedLabels} />
		</WithCreateAffordance>
	);
}

function SearchableStaticSelect({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	options,
	resolvedLabels,
}: StaticSelectProps) {
	const choices = options?.options ?? [];
	const [query, setQuery] = useState("");
	const filtered = choices.filter((option) => matchesQuery(option.label, query));
	const current = asString(value);
	// An empty value is "nothing selected", not an option labelled "".
	const selectedOption =
		current !== ""
			? (choices.find((option) => option.value === current) ??
				resolvedLabels?.[current] ?? { value: current, label: current })
			: undefined;

	return (
		<SingleComboboxShell
			id={id}
			name={name}
			value={current || null}
			selected={selectedOption}
			onChange={onChange}
			onBlur={onBlur}
			disabled={disabled}
			invalid={invalid}
			onQueryChange={setQuery}
			listState={filtered.length === 0 ? "empty" : "rows"}
		>
			{filtered.map((option) => (
				<ComboboxOption
					key={option.value}
					option={option}
					testId={`select-option-${name}`}
				/>
			))}
		</SingleComboboxShell>
	);
}

// ─── Async single select ──────────────────────────────────────────────────────

function AsyncSingleSelectWithCreate(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const value = typeof props.value === "string" ? props.value : null;
	const remote = useRemoteOptions({
		name: props.name,
		value,
		opts,
		onChange: props.onChange,
	});
	const [refetchKey, setRefetchKey] = useState(0);

	if (remote.isFirstLoad) {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}

	return (
		<WithCreateAffordance
			{...props}
			resolvedLabels={remote.labels}
			onCreated={() => setRefetchKey((k) => k + 1)}
		>
			<AsyncSingleSelectInner
				{...props}
				options={remote.opts}
				disabled={props.disabled || remote.dep.disabledByParent}
				resolved={{ kind: "ready", labels: remote.labels }}
				refetchKey={refetchKey}
				dep={remote.dep}
				onRowsSeen={remote.noteRowsSeen}
			/>
		</WithCreateAffordance>
	);
}

interface AsyncSingleSelectInnerProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolved: { kind: "ready"; labels: OptionMap };
	refetchKey: number;
	dep: DependencyState;
	/** Reports the options this dropdown listed so a selection need not re-resolve them. */
	onRowsSeen: (rows: OptionMap) => void;
}

function AsyncSingleSelectInner(props: AsyncSingleSelectInnerProps) {
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const ctx = useClientActionContext();
	const value = typeof props.value === "string" ? props.value : null;
	const gated = props.dep.hasDeps && !props.dep.ready;
	const [query, setQuery] = useState("");
	const search = useAsyncSearch({
		ctx,
		query: gated ? undefined : opts.query,
		search: query,
		refetchKey: `${props.refetchKey}:${props.dep.depsKey}`,
	});
	// Only the first load has nothing to show. Later refetches — typing, a
	// selection resetting the query, a create — keep the control mounted so it
	// never blinks through a skeleton and never drops the text being typed.
	const hasRenderedRef = useRef(false);

	if (search.kind === "loading" && !hasRenderedRef.current) {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	// A failure before anything rendered has no control to fall back to.
	// Afterwards the shell stays: unmounting it removes the input, and with it
	// the only way to change the search and retry.
	if (search.kind === "error" && !hasRenderedRef.current) {
		return <>{renderAsyncError(opts.error, search.message, <FormSkeleton />)}</>;
	}
	hasRenderedRef.current = true;
	const rows: unknown[] = gated || search.kind !== "ready" ? [] : search.rows;
	const listed: OptionMap = {};
	for (const row of rows) {
		const v = String(opts.optionValue?.(row) ?? "");
		listed[v] = opts.optionRow?.(row) ?? { value: v, label: opts.optionLabel?.(row) ?? v };
	}
	props.onRowsSeen(listed);
	// A pending refetch keeps the previous rows rather than blanking the list.
	let listState: SingleListState = "rows";
	if (search.kind === "error") {
		listState = "failed";
	} else if (search.kind === "ready" && Object.keys(listed).length === 0) {
		listState = "empty";
	}
	// An empty string is "nothing selected", not an option labelled "".
	const hasValue = value !== null && value !== "";
	const selected = hasValue
		? (props.resolved.labels[value] ?? { value, label: value })
		: undefined;
	return (
		<SingleComboboxShell
			id={props.id}
			name={props.name}
			value={value}
			selected={selected}
			onChange={props.onChange}
			onBlur={props.onBlur}
			disabled={props.disabled}
			invalid={props.invalid}
			onQueryChange={setQuery}
			listState={listState}
		>
			{Object.entries(listed).map(([v, option]) => (
				<ComboboxOption key={v} option={option} />
			))}
		</SingleComboboxShell>
	);
}
