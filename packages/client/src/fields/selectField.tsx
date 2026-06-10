import { useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSingleResolvedLabel } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
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
	children: React.ReactNode;
}

function WithCreateAffordance({
	name,
	onChange,
	options,
	resolvedLabels,
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
	return (
		<WithCreateAffordance {...props}>
			<StaticSingleSelect {...props} />
		</WithCreateAffordance>
	);
}

function StaticSingleSelect({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const t = useTranslation();
	const choices = options?.options ?? [];
	return (
		<Select
			value={typeof value === "string" ? value : ""}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			disabled={disabled}
		>
			<SelectTrigger
				id={id ?? name}
				onBlur={onBlur}
				data-testid={`select-${name}`}
				className="w-full"
			>
				<SelectValue placeholder={t("field.select.placeholder")} />
			</SelectTrigger>
			<SelectContent>
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
	return (
		<WithCreateAffordance {...props}>
			<SearchableStaticSelect {...props} />
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
}: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const t = useTranslation();
	const choices = options?.options ?? [];
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);
	const filtered = search
		? choices.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
		: choices;
	const currentLabel =
		typeof value === "string" ? (choices.find((o) => o.value === value)?.label ?? value) : "";

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
			id={id ?? name}
			className="relative"
			data-testid={`select-${name}`}
			onKeyDown={handleKeyDown}
		>
			<input
				type="text"
				data-testid={`select-search-${name}`}
				placeholder={currentLabel || t("field.select.placeholder")}
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

	if (resolved.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}

	return (
		<WithCreateAffordance {...props} resolvedLabels={resolved.labels}>
			<AsyncSingleSelectInner {...props} resolved={resolved} />
		</WithCreateAffordance>
	);
}

interface AsyncSingleSelectInnerProps extends FieldFormProps<SelectValueType, SelectOptionsBag> {
	resolved: { kind: "ready"; labels: Record<string, string> };
}

function AsyncSingleSelectInner(props: AsyncSingleSelectInnerProps) {
	const t = useTranslation();
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const ctx = useClientActionContext();
	const value = typeof props.value === "string" ? props.value : null;
	const search = useAsyncSearch(ctx, opts.query, "");

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
				id={props.id ?? props.name}
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
