import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { type LabeledOption, optionLabel } from "./optionLabel";
import { LabelChips } from "./tagsShared";

interface ToggleButtonsBag {
	options?: LabeledOption[];
	multiple?: boolean;
}

type ToggleButtonsValue = string | string[];

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
	return <LabelChips value={value} labelFor={(v) => optionLabel(v, options)} />;
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
	const current = asString(value);
	return (
		<ToggleGroup
			id={fieldId({ id, name })}
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
			id={fieldId({ id, name })}
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
