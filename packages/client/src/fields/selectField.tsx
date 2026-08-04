import { useRef, useState } from "react";
import { useDensity } from "../app/densityContext";
import { useTranslation } from "../i18n/i18n";
import { cn } from "../lib/cn";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Input, inputCompactFontClass, inputTextClass } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
	EMPTY_LABELS,
	type OptionMap,
	type ReadyLabels,
	type SeenLabel,
	useSingleResolvedLabel,
} from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import { type DependencyState, useFieldDependencies } from "./fieldDependencies";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { SelectCreateDialog } from "./selectCreateDialog";
import { SelectMultiForm } from "./selectMulti";
import { SelectOptionContent } from "./selectOptionContent";
import {
	coerceSelectValue,
	type SelectCreateConfig,
	type SelectOptionsBag,
	type SelectSingleOptionsBag,
	type SelectValueType,
	type StaticOption,
} from "./selectShared";

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
		return <SelectMultiForm {...props} />;
	}
	if (opts.query) {
		return <AsyncSingleSelectWithCreate {...props} />;
	}
	if (opts.searchable) {
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
	options,
	resolvedLabels,
	onCreated,
	children,
}: WithCreateProps) {
	const [open, setOpen] = useState(false);
	const create = options?.create as SelectCreateConfig | undefined;
	if (!create) {
		return <>{children}</>;
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
			{children}
			<button
				type="button"
				data-testid={`select-create-${name}`}
				onClick={() => setOpen(true)}
				className="self-start text-xs text-primary underline"
			>
				+ Create
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
	const t = useTranslation();
	const density = useDensity();
	const choices = options?.options ?? [];
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);
	const filtered = search
		? choices.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
		: choices;
	// An empty value is "nothing selected", not an option labelled "".
	const selectedOption =
		typeof value === "string" && value !== ""
			? (choices.find((o) => o.value === value) ??
				resolvedLabels?.[value] ?? { value, label: value })
			: undefined;
	// Show the selected label as normal-colored text, not gray placeholder text.
	const showLabel = selectedOption !== undefined && search === "";

	function handleOpen(): void {
		if (!disabled) {
			setOpen(true);
		}
	}

	function handleClose(): void {
		setOpen(false);
		setSearch("");
		onBlur?.();
	}

	function handleSelect(optValue: string): void {
		onChange(optValue);
		setSearch("");
		setOpen(false);
	}

	function handleKeyDown(e: React.KeyboardEvent): void {
		if (e.key === "Escape") {
			handleClose();
		}
	}

	return (
		<div
			id={fieldId({ id, name })}
			className="relative"
			data-testid={`select-${name}`}
			onKeyDown={handleKeyDown}
		>
			<Input
				type="text"
				data-testid={`select-search-${name}`}
				placeholder={showLabel ? "" : t("field.select.placeholder")}
				value={search}
				onClick={handleOpen}
				onFocus={handleOpen}
				onChange={(e) => setSearch(e.target.value)}
				onBlur={(e) => {
					// Delay so option button mousedown fires before blur closes the list.
					const related = e.relatedTarget as HTMLElement | null;
					if (!related?.closest(`[data-testid="select-${name}"]`)) {
						handleClose();
					}
				}}
				disabled={disabled}
				aria-invalid={invalid || undefined}
			/>
			{showLabel && selectedOption && (
				// Selected label replaces the empty input's placeholder and stays on one line.
				<span
					data-testid={`select-label-${name}`}
					onClick={handleOpen}
					className={cn(
						"pointer-events-none absolute inset-y-0 right-0 left-0 flex min-w-0 items-center truncate text-foreground",
						inputTextClass,
						density === "compact" && inputCompactFontClass,
					)}
				>
					<SelectOptionContent option={selectedOption} surface="inline" />
				</span>
			)}
			{open && (
				<div className="absolute z-10 mt-1 w-full rounded border border-input bg-background shadow-md">
					{filtered.map((opt) => (
						<button
							key={opt.value}
							type="button"
							data-testid={`select-option-${name}`}
							disabled={disabled}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => handleSelect(opt.value)}
							className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
						>
							<SelectOptionContent option={opt} />
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Async single select ──────────────────────────────────────────────────────

function AsyncSingleSelectWithCreate(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const ctx = useClientActionContext();
	const value = typeof props.value === "string" ? props.value : null;
	const dep = useFieldDependencies({ config: opts, value, onChange: props.onChange });
	const boundOpts = dep.hasDeps ? bindDeps(opts, dep.deps) : opts;
	// Resolving a label under stale deps would show a value the new parent no
	// longer offers, so the request waits until every parent has a value.
	const isResolveGated = dep.hasDeps && !dep.ready;
	// Rows the dropdown listed already carry their labels; feeding them back
	// stops a selection from re-resolving a label we just displayed. Each entry
	// records the deps it was seen under, so new deps never reuse an old label.
	const seenLabels = useRef<Record<string, SeenLabel>>({});
	const knownLabels: OptionMap = {};
	for (const [rowValue, seen] of Object.entries(seenLabels.current)) {
		if (seen.depsKey === dep.depsKey) {
			knownLabels[rowValue] = seen.option;
		}
	}
	const resolved = useSingleResolvedLabel({
		ctx,
		fieldName: props.name,
		value: isResolveGated ? null : value,
		opts: boundOpts,
		refetchKey: dep.depsKey,
		knownLabels,
	});
	const [refetchKey, setRefetchKey] = useState(0);
	const lastReady = useRef<ReadyLabels>(EMPTY_LABELS);
	if (resolved.kind === "ready") {
		lastReady.current = resolved;
	}

	// Only the very first resolve has nothing to show. A re-resolve keeps the
	// previous labels on screen so the control does not blink through a skeleton.
	if (resolved.kind === "loading" && lastReady.current === EMPTY_LABELS) {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	const ready = resolved.kind === "ready" ? resolved : lastReady.current;

	return (
		<WithCreateAffordance
			{...props}
			resolvedLabels={ready.labels}
			onCreated={() => setRefetchKey((k) => k + 1)}
		>
			<AsyncSingleSelectInner
				{...props}
				options={boundOpts}
				disabled={props.disabled || dep.disabledByParent}
				resolved={ready}
				refetchKey={refetchKey}
				dep={dep}
				onRowsSeen={(rows) => {
					for (const [rowValue, option] of Object.entries(rows)) {
						seenLabels.current[rowValue] = { option, depsKey: dep.depsKey };
					}
				}}
			/>
		</WithCreateAffordance>
	);
}

function bindDeps(
	opts: SelectSingleOptionsBag,
	deps: Record<string, string>,
): SelectSingleOptionsBag {
	const { query, onLoad } = opts;
	return {
		...opts,
		query: query ? (ctx, search) => query(ctx, search, deps) : undefined,
		onLoad: onLoad ? (ctx, value) => onLoad(ctx, value, deps) : undefined,
	};
}

interface AsyncSingleSelectInnerProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolved: { kind: "ready"; labels: OptionMap };
	refetchKey: number;
	dep: DependencyState;
	/** Reports the options this dropdown listed so a selection need not re-resolve them. */
	onRowsSeen: (rows: OptionMap) => void;
}

function AsyncSingleSelectInner(props: AsyncSingleSelectInnerProps) {
	const t = useTranslation();
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const ctx = useClientActionContext();
	const value = typeof props.value === "string" ? props.value : null;
	const gated = props.dep.hasDeps && !props.dep.ready;
	const search = useAsyncSearch({
		ctx,
		query: gated ? undefined : opts.query,
		search: "",
		refetchKey: `${props.refetchKey}:${props.dep.depsKey}`,
	});

	if (search.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	if (search.kind === "error") {
		return <>{renderAsyncError(opts.error, search.message, <FormSkeleton />)}</>;
	}
	const rows: unknown[] = gated ? [] : search.rows;
	const listed: OptionMap = {};
	for (const row of rows) {
		const v = String(opts.optionValue?.(row) ?? "");
		listed[v] = opts.optionRow?.(row) ?? { value: v, label: opts.optionLabel?.(row) ?? v };
	}
	props.onRowsSeen(listed);
	const selected = value === null ? undefined : props.resolved.labels[value];
	return (
		<Select
			value={value ?? ""}
			onValueChange={(next) => props.onChange(next === "" ? null : next)}
			disabled={props.disabled}
		>
			<SelectTrigger
				id={fieldId({ id: props.id, name: props.name })}
				onBlur={props.onBlur}
				data-testid={`select-${props.name}`}
				className="w-full"
			>
				<SelectValue placeholder={t("field.select.placeholder")}>
					{selected ? (
						<SelectOptionContent option={selected} surface="inline" />
					) : (
						(value ?? undefined)
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{Object.entries(listed).map(([v, option]) => (
					<SelectItem key={v} value={v} textValue={option.label}>
						<SelectOptionContent option={option} />
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
