import { Input } from "../ui/input";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";

export function NumberCell({ value }: FieldCellProps<number>) {
	return nullableCell(value, (v) => <span>{String(v)}</span>);
}

export function NumberForm({ id, name, value, onChange, disabled }: FieldFormProps<number>) {
	return (
		<Input
			id={fieldId({ id, name })}
			name={name}
			type="number"
			defaultValue={typeof value === "number" ? String(value) : ""}
			onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
			disabled={disabled}
		/>
	);
}
