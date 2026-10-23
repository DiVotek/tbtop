import { Checkbox } from "../ui/checkbox";
import { isOn } from "./booleanValue";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function CheckboxCell({ value }: FieldCellProps<boolean>) {
	return nullableCell(value, (v) => <span>{isOn(v) ? "✓" : "—"}</span>);
}

export function CheckboxForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	describedBy,
}: FieldFormProps<boolean>) {
	return (
		<Checkbox
			id={fieldId({ id, name })}
			name={name}
			checked={isOn(value)}
			onCheckedChange={(next) => onChange(next === true)}
			onBlur={onBlur}
			disabled={disabled}
			aria-describedby={describedBy}
		/>
	);
}
