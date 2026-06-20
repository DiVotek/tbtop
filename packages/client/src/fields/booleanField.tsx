import { Switch } from "../ui/switch";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function BooleanCell({ value }: FieldCellProps<boolean>) {
	return nullableCell(value, (v) => <span>{v ? "✓" : "—"}</span>);
}

export function BooleanForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
}: FieldFormProps<boolean>) {
	return (
		<Switch
			id={fieldId({ id, name })}
			name={name}
			checked={value === true}
			onCheckedChange={(next) => onChange(next)}
			onBlur={onBlur}
			disabled={disabled}
		/>
	);
}
