import { Checkbox } from "../ui/checkbox";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function CheckboxCell({ value }: FieldCellProps<boolean>) {
	return nullableCell(value, (v) => <span>{v ? "✓" : "—"}</span>);
}

export function CheckboxForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
}: FieldFormProps<boolean>) {
	return (
		<Checkbox
			id={fieldId({ id, name })}
			name={name}
			checked={value === true}
			onCheckedChange={(next) => onChange(next === true)}
			onBlur={onBlur}
			disabled={disabled}
		/>
	);
}
