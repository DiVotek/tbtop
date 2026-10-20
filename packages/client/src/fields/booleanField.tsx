import { Switch } from "../ui/switch";
import { isOn } from "./booleanValue";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function BooleanCell({ value }: FieldCellProps<boolean>) {
	return nullableCell(value, (v) => <span>{isOn(v) ? "✓" : "—"}</span>);
}

export function BooleanForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	describedBy,
}: FieldFormProps<boolean>) {
	return (
		<Switch
			id={fieldId({ id, name })}
			name={name}
			checked={isOn(value)}
			onCheckedChange={(next) => onChange(next)}
			onBlur={onBlur}
			disabled={disabled}
			aria-describedby={describedBy}
		/>
	);
}
