import { useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { FieldSkeleton } from "../structure/defaults";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AsyncOptionCombobox } from "./asyncOptionCombobox";
import type { OptionMap } from "./asyncOptions";
import { CreateAffordance } from "./createAffordance";
import type { DependencyState } from "./fieldDependencies";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { InputGroup } from "./inputGroup";
import { SelectMultiForm } from "./selectMulti";
import { ComboboxOption, matchesQuery } from "./selectMultiOption";
import { SelectOptionContent } from "./selectOptionContent";
import {
	coerceSelectValue,
	type SelectOptionsBag,
	type SelectSingleOptionsBag,
	type SelectValueType,
	type StaticOption,
} from "./selectShared";
import { SingleComboboxShell } from "./selectSingleShell";
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

// ─── Static single select ─────────────────────────────────────────────────────

function StaticSingleSelectWithCreate(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const resolvedLabels = useRef<OptionMap>({}).current;
	return (
		<CreateAffordance {...props} resolvedLabels={resolvedLabels}>
			<StaticSingleSelect {...props} resolvedLabels={resolvedLabels} />
		</CreateAffordance>
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
	describedBy,
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
				aria-describedby={describedBy}
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
		<CreateAffordance {...props} resolvedLabels={resolvedLabels}>
			<SearchableStaticSelect {...props} resolvedLabels={resolvedLabels} />
		</CreateAffordance>
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
	describedBy,
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
			describedBy={describedBy}
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
	});
	const [refetchKey, setRefetchKey] = useState(0);

	if (remote.isFirstLoad) {
		return <>{opts.loading ?? <FieldSkeleton />}</>;
	}

	return (
		<CreateAffordance
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
		</CreateAffordance>
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
	const value = typeof props.value === "string" ? props.value : null;
	return (
		<AsyncOptionCombobox
			id={props.id}
			name={props.name}
			value={value}
			onChange={props.onChange}
			onBlur={props.onBlur}
			disabled={props.disabled}
			invalid={props.invalid}
			describedBy={props.describedBy}
			opts={opts}
			labels={props.resolved.labels}
			dep={props.dep}
			refetchKey={props.refetchKey}
			onRowsSeen={props.onRowsSeen}
			loading={opts.loading}
			error={opts.error}
		/>
	);
}
