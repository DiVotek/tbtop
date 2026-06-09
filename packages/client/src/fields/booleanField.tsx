import { Switch } from "../ui/switch";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function BooleanCell({ value }: FieldCellProps<boolean>) {
	if (value === null || value === undefined) {
		return null;
	}
	return <span>{value ? "✓" : "—"}</span>;
}

export function BooleanForm({ id, name, value, onChange, onBlur }: FieldFormProps<boolean>) {
	return (
		<Switch
			id={id ?? name}
			name={name}
			checked={value === true}
			onCheckedChange={(next) => onChange(next)}
			onBlur={onBlur}
		/>
	);
}
