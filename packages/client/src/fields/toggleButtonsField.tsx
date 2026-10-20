import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { type LabeledOption, optionLabel } from "./optionLabel";
import { coerceSelectValue } from "./selectShared";
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
	const coerced = coerceSelectValue(value);
	if (coerced === null) {
		return null;
	}
	if (Array.isArray(coerced)) {
		return coerced.length === 0 ? null : (
			<MultiCell value={coerced} options={options?.options} />
		);
	}
	return <span>{optionLabel(coerced, options?.options)}</span>;
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
	// Records carry int-backed values (2) while wire options are string-cast ("2").
	const coerced = coerceSelectValue(value);
	const current = typeof coerced === "string" ? coerced : "";
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
	const coerced = coerceSelectValue(value);
	const current = Array.isArray(coerced) ? coerced : [];
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
