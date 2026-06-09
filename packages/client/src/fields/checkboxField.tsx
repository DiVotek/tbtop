import { Checkbox } from "../ui/checkbox";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function CheckboxCell({ value }: FieldCellProps<boolean>) {
	if (value === null || value === undefined) {
		return null;
	}
	return <span>{value ? "✓" : "—"}</span>;
}

export function CheckboxForm({ id, name, value, onChange, onBlur }: FieldFormProps<boolean>) {
	return (
		<Checkbox
			id={id ?? name}
			name={name}
			checked={value === true}
			onCheckedChange={(next) => onChange(next === true)}
			onBlur={onBlur}
		/>
	);
}
