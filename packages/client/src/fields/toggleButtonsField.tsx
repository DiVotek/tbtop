import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { type LabeledOption, optionLabel } from "./optionLabel";
import { Chips } from "./tagsShared";

interface ToggleButtonsBag {
	options?: LabeledOption[];
	multiple?: boolean;
}

type ToggleButtonsValue = string | string[];

const NOOP_REMOVE = () => {};

export function ToggleButtonsCell({
	value,
	options,
}: FieldCellProps<ToggleButtonsValue, ToggleButtonsBag>) {
	if (value === null || value === undefined) {
		return null;
	}
	if (Array.isArray(value)) {
		return value.length === 0 ? null : <MultiCell value={value} options={options?.options} />;
	}
	return <span>{optionLabel(value, options?.options)}</span>;
}

function MultiCell({ value, options }: { value: string[]; options?: LabeledOption[] }) {
	return (
		<div className="flex flex-wrap gap-1">
			<Chips
				name="togglebuttons-cell"
				value={value}
				onRemove={NOOP_REMOVE}
				labelFor={(v) => optionLabel(v, options)}
				disabled
			/>
		</div>
	);
}

export function ToggleButtonsForm(props: FieldFormProps<ToggleButtonsValue, ToggleButtonsBag>) {
	if (props.options?.multiple) {
		return <MultiForm {...props} />;
	}
	return <SingleForm {...props} />;
}

function Items({ options }: { options: LabeledOption[] }) {
	return (
		<>
			{options.map((opt) => (
				<ToggleGroupItem key={opt.value} value={opt.value}>
					{opt.label}
				</ToggleGroupItem>
			))}
		</>
	);
}

function SingleForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<ToggleButtonsValue, ToggleButtonsBag>) {
	const current = typeof value === "string" ? value : "";
	return (
		<ToggleGroup
			id={id ?? name}
			type="single"
			value={current}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			onBlur={onBlur}
			disabled={disabled}
			data-testid={`togglebuttons-${name}`}
		>
			<Items options={options?.options ?? []} />
		</ToggleGroup>
	);
}

function MultiForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<ToggleButtonsValue, ToggleButtonsBag>) {
	const current = Array.isArray(value) ? value : [];
	return (
		<ToggleGroup
			id={id ?? name}
			type="multiple"
			value={current}
			onValueChange={(next) => onChange(next.length === 0 ? null : next)}
			onBlur={onBlur}
			disabled={disabled}
			data-testid={`togglebuttons-${name}`}
		>
			<Items options={options?.options ?? []} />
		</ToggleGroup>
	);
}
