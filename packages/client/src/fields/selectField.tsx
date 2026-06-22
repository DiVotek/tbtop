import { useRef, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSingleResolvedLabel } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { SelectCreateDialog } from "./selectCreateDialog";
import { SelectMultiForm } from "./selectMulti";
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
	resolvedLabels?: Record<string, string>;
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
			resolvedLabels[value] = label;
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
	const resolvedLabels = useRef<Record<string, string>>({}).current;
	return (
		<WithCreateAffordance {...props} resolvedLabels={resolvedLabels}>
			<StaticSingleSelect {...props} resolvedLabels={resolvedLabels} />
		</WithCreateAffordance>
	);
}

interface StaticSelectProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolvedLabels?: Record<string, string>;
}

function StaticSingleSelect({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
	resolvedLabels,
}: StaticSelectProps) {
	const t = useTranslation();
	const choices = options?.options ?? [];
	const current = asString(value);
	const createdLabel = current ? resolvedLabels?.[current] : undefined;
	// A created option isn't in `choices`; emit it so Radix can match + label it.
	const isUnlisted = createdLabel !== undefined && !choices.some((o) => o.value === current);
	return (
		<Select
			value={current}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			disabled={disabled}
		>
			<SelectTrigger
				id={fieldId({ id, name })}
				onBlur={onBlur}
				data-testid={`select-${name}`}
				className="w-full"
			>
				<SelectValue placeholder={t("field.select.placeholder")} />
			</SelectTrigger>
			<SelectContent>
				{isUnlisted && (
					<SelectItem key={current} value={current}>
						{createdLabel}
					</SelectItem>
				)}
				{choices.map((opt) => (
					<SelectItem key={opt.value} value={opt.value}>
						{opt.label}
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
	const resolvedLabels = useRef<Record<string, string>>({}).current;
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
	options,
	resolvedLabels,
}: StaticSelectProps) {
	const t = useTranslation();
	const choices = options?.options ?? [];
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);
	const filtered = search
		? choices.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
		: choices;
	const currentLabel =
		typeof value === "string"
			? (resolvedLabels?.[value] ?? choices.find((o) => o.value === value)?.label ?? value)
			: "";
	// Show the selected label as normal-colored text, not gray placeholder text.
	const showLabel = currentLabel !== "" && search === "";

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
			<input
				type="text"
				data-testid={`select-search-${name}`}
				placeholder={t("field.select.placeholder")}
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
				className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
			/>
			{showLabel && (
				// Selected label as normal text — sits over the empty input, not gray placeholder.
				<span
					data-testid={`select-label-${name}`}
					onClick={handleOpen}
					className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-sm text-foreground"
				>
					{currentLabel}
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
							{opt.label}
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
	const resolved = useSingleResolvedLabel({ ctx, fieldName: props.name, value, opts });
	const [refetchKey, setRefetchKey] = useState(0);

	if (resolved.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}

	return (
		<WithCreateAffordance
			{...props}
			resolvedLabels={resolved.labels}
			onCreated={() => setRefetchKey((k) => k + 1)}
		>
			<AsyncSingleSelectInner {...props} resolved={resolved} refetchKey={refetchKey} />
		</WithCreateAffordance>
	);
}

interface AsyncSingleSelectInnerProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolved: { kind: "ready"; labels: Record<string, string> };
	refetchKey: number;
}

function AsyncSingleSelectInner(props: AsyncSingleSelectInnerProps) {
	const t = useTranslation();
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const ctx = useClientActionContext();
	const value = typeof props.value === "string" ? props.value : null;
	const search = useAsyncSearch({
		ctx,
		query: opts.query,
		search: "",
		refetchKey: props.refetchKey,
	});

	if (search.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	if (search.kind === "error") {
		return <>{renderAsyncError(opts.error, search.message, <FormSkeleton />)}</>;
	}
	const display = value === null ? undefined : (props.resolved.labels[value] ?? value);
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
				<SelectValue placeholder={t("field.select.placeholder")}>{display}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{search.rows.map((row) => {
					const v = String(opts.optionValue?.(row) ?? "");
					const lbl = opts.optionLabel?.(row) ?? v;
					return (
						<SelectItem key={v} value={v}>
							{lbl}
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
