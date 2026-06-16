import { useClientActionContext } from "../structure/actionContext";
import { FormSkeleton } from "../structure/defaults";
import { renderAsyncError } from "../structure/renderAsyncError";
import { useMultiResolvedLabels } from "./asyncOptions";
import { useAsyncSearch } from "./asyncSearch";
import type { FieldFormProps } from "./fieldProps";
import { WithMultiCreateAffordance } from "./selectMultiCreate";
import type {
	SelectMultiOptionsBag,
	SelectOptionsBag,
	SelectValueType,
	StaticOption,
} from "./selectShared";

export function SelectMultiForm(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = props.options ?? {};
	if (opts.query) {
		return <AsyncMultiSelect {...props} />;
	}
	return <StaticMultiSelect {...props} />;
}

function StaticMultiSelect(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const { id, name, value, onChange, onBlur, disabled, options } = props;
	const choices = options?.options ?? [];
	const current = Array.isArray(value) ? value : [];
	function toggle(v: string): void {
		const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
		onChange(next);
	}
	return (
		<WithMultiCreateAffordance {...props}>
			<div
				id={id ?? name}
				role="listbox"
				aria-multiselectable="true"
				className="flex flex-wrap gap-2"
				data-testid={`select-${name}`}
				onBlur={onBlur}
			>
				{choices.map((opt) => (
					<OptionButton
						key={opt.value}
						label={opt.label}
						selected={current.includes(opt.value)}
						disabled={disabled}
						onClick={() => toggle(opt.value)}
					/>
				))}
			</div>
		</WithMultiCreateAffordance>
	);
}

function AsyncMultiSelect(props: FieldFormProps<SelectValueType, SelectOptionsBag>) {
	const opts = (props.options ?? {}) as SelectMultiOptionsBag;
	const ctx = useClientActionContext();
	const current = Array.isArray(props.value) ? props.value : [];
	const resolved = useMultiResolvedLabels({ ctx, fieldName: props.name, value: current, opts });
	const search = useAsyncSearch(ctx, opts.query, "");
	if (resolved.kind === "loading" || search.kind === "loading") {
		return <>{opts.loading ?? <FormSkeleton />}</>;
	}
	if (search.kind === "error") {
		return <>{renderAsyncError(opts.error, search.message, <FormSkeleton />)}</>;
	}
	const hasOnLoad = opts.onLoad !== undefined;
	const visible = hasOnLoad ? current.filter((v) => v in resolved.labels) : current;
	function setValue(next: string[]): void {
		props.onChange(next);
	}
	const resolvedLabels = resolved.kind === "ready" ? resolved.labels : undefined;
	return (
		<WithMultiCreateAffordance {...props} resolvedLabels={resolvedLabels}>
			<div
				role="listbox"
				aria-multiselectable="true"
				className="flex flex-wrap gap-2"
				data-testid={`select-${props.name}`}
				onBlur={props.onBlur}
			>
				{visible.map((v) => (
					<SelectedChip
						key={v}
						value={v}
						label={resolved.labels[v] ?? v}
						onRemove={() => setValue(current.filter((x) => x !== v))}
					/>
				))}
				{search.rows.map((row) => {
					const v = String(opts.optionValue?.(row) ?? "");
					const lbl = opts.optionLabel?.(row) ?? v;
					const selected = current.includes(v);
					return (
						<OptionButton
							key={v}
							label={lbl}
							selected={selected}
							onClick={() =>
								setValue(
									selected ? current.filter((x) => x !== v) : [...current, v],
								)
							}
						/>
					);
				})}
			</div>
		</WithMultiCreateAffordance>
	);
}

interface OptionButtonInput {
	label: string;
	selected: boolean;
	disabled?: boolean;
	onClick: () => void;
}

function OptionButton({ label, selected, disabled, onClick }: OptionButtonInput) {
	return (
		<button
			type="button"
			role="option"
			aria-selected={selected}
			disabled={disabled}
			onClick={onClick}
			className={
				selected
					? "rounded border border-primary bg-primary px-2 py-1 text-primary-foreground text-xs"
					: "rounded border border-input bg-background px-2 py-1 text-xs"
			}
		>
			{label}
		</button>
	);
}

interface SelectedChipInput {
	value: string;
	label: string;
	onRemove: () => void;
}

function SelectedChip({ value, label, onRemove }: SelectedChipInput) {
	return (
		<span
			data-testid={`chip-${value}`}
			className="flex items-center gap-1 rounded border border-primary bg-primary px-2 py-1 text-primary-foreground text-xs"
		>
			{label}
			<button
				type="button"
				aria-label={`Remove ${label}`}
				onClick={onRemove}
				className="text-primary-foreground hover:text-foreground"
			>
				×
			</button>
		</span>
	);
}

export type { StaticOption };
