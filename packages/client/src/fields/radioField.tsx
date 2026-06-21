import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { nullableCell } from "./cellHelpers";
import { asString, type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { OptionRow } from "./optionList";

interface RadioOption {
	value: string;
	label: string;
}

interface RadioOptionsBag {
	options?: RadioOption[];
}

export function RadioCell({ value, options }: FieldCellProps<string, RadioOptionsBag>) {
	return nullableCell(value, (v) => {
		const match = options?.options?.find((o) => o.value === v);
		return <span>{match?.label ?? v}</span>;
	});
}

export function RadioForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	options,
}: FieldFormProps<string, RadioOptionsBag>) {
	const choices = options?.options ?? [];
	const groupId = fieldId({ id, name });
	return (
		<RadioGroup
			id={groupId}
			value={asString(value)}
			onValueChange={(next) => onChange(next === "" ? null : next)}
			onBlur={onBlur}
			disabled={disabled}
			data-testid={`radio-${name}`}
		>
			{choices.map((opt) => (
				<OptionRow
					key={opt.value}
					groupId={groupId}
					value={opt.value}
					label={opt.label}
					control={(itemId) => <RadioGroupItem id={itemId} value={opt.value} />}
				/>
			))}
		</RadioGroup>
	);
}
