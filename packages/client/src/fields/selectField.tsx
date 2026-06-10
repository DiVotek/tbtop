import { useTranslation } from "../i18n/i18n";
import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSingleResolvedLabel } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { SelectMultiForm } from "./selectMulti";
import type {
	SelectOptionsBag,
	SelectSingleOptionsBag,
	SelectValueType,
	StaticOption,
} from "./selectShared";

export function SelectCell({ value, options }: FieldCellProps<SelectValueType, SelectOptionsBag>) {
	if (value === null || value === undefined) {
		return null;
	}
	if (Array.isArray(value)) {
		const labels = value.map((v) => labelForStatic(v, options?.options));
		return <span>{labels.join(", ")}</span>;
	}
	return <span>{labelForStatic(value, options?.options)}</span>;
}

function labelForStatic(value: string, choices: StaticOption[] | undefined): string {
	const match = choices?.find((o) => o.value === value);
	return match?.label ?? value;
}

export function SelectForm(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = props.options ?? {};
	if (opts.multiple === true) {
		return <SelectMultiForm {...props} />;
	}
	if (opts.query) {
		return <AsyncSingleSelect {...props} />;
	}
	return <StaticSingleSelect {...props} />;
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

function AsyncSingleSelect(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const t = useTranslation();
	const opts = (props.options ?? {}) as SelectSingleOptionsBag;
	const ctx = useClientActionContext();
	const value = typeof props.value === "string" ? props.value : null;
	const resolved = useSingleResolvedLabel({ ctx, fieldName: props.name, value, opts });
	const search = useAsyncSearch(ctx, opts.query, "");
	if (resolved.kind === "loading" || search.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	if (search.kind === "error") {
		return <>{renderAsyncError(opts.error, search.message, <FormSkeleton />)}</>;
	}
	const display = value === null ? undefined : (resolved.labels[value] ?? value);
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
